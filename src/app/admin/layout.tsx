import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Redirection si non connecté
  if (!session?.user) {
    redirect("/auth/login");
  }

  // Redirection si pas admin
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* Sidebar */}
      <AdminSidebar user={session.user} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        <AdminHeader user={session.user} />

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
