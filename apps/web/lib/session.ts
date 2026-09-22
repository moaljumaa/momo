import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Response("Unauthorized", { status: 401 });
  return session;
}
