import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Deliberately no Sidebar/SettingsModal chrome — this is a forced full-page flow, not part
// of the operational app. (app)/layout.tsx redirects here until Settings.onboardingCompletedAt
// is set; this layout only needs to keep unauthenticated visitors out.
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return <div className="min-h-screen bg-background text-ink">{children}</div>;
}
