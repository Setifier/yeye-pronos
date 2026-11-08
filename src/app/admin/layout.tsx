import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminNav } from "@/components/admin/admin-nav";

// Les boutons de l'admin lancent les mêmes tâches que les CRON : jusqu'à 60 s (limite Vercel Hobby)
export const maxDuration = 60;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/auth/login?redirect=/admin/dashboard");
  if (session.user.role !== "ADMIN") redirect("/");

  // Avant `npx prisma db push`, la table n'existe pas : l'admin reste utilisable
  const openBugs = await prisma.bugReport.count({ where: { status: "OPEN" } }).catch(() => 0);

  return (
    <div className="flex-1 bg-zinc-950">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:flex lg:gap-8 lg:px-8 lg:py-10">
        <aside className="lg:w-52 lg:shrink-0">
          <div className="lg:sticky lg:top-24">
            <p className="mb-3 hidden px-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500 lg:block">
              Administration
            </p>
            <AdminNav openBugs={openBugs} />
          </div>
        </aside>
        <main className="mt-6 min-w-0 flex-1 lg:mt-0">{children}</main>
      </div>
    </div>
  );
}
