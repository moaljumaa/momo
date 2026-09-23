import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@momo/db";
import { Sidebar } from "@/components/sidebar";
import { SettingsModalProvider } from "@/components/settings-modal-provider";
import { SettingsModal } from "@/components/settings-modal";
import { ConversationNotifications } from "@/components/conversation-notifications";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  // Single-tenant: onboarding is an instance-level, one-time gate, not per-user.
  const settings = await prisma.settings.findUnique({ where: { id: 1 }, select: { onboardingCompletedAt: true } });
  if (!settings?.onboardingCompletedAt) redirect("/onboarding");

  const isAdmin = session.user.role === "ADMIN";

  return (
    <SettingsModalProvider>
      <div className="flex min-h-screen">
        <Sidebar
          name={session.user.name}
          email={session.user.email}
          image={session.user.image ?? null}
          isAdmin={isAdmin}
        />
        <main className="flex-1">{children}</main>
      </div>
      <SettingsModal isAdmin={isAdmin} />
      <ConversationNotifications />
    </SettingsModalProvider>
  );
}
