import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { SettingsModalProvider } from "@/components/settings-modal-provider";
import { SettingsModal } from "@/components/settings-modal";
import { ConversationNotifications } from "@/components/conversation-notifications";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return (
    <SettingsModalProvider>
      <div className="flex min-h-screen">
        <Sidebar email={session.user.email} />
        <main className="flex-1">{children}</main>
      </div>
      <SettingsModal />
      <ConversationNotifications />
    </SettingsModalProvider>
  );
}
