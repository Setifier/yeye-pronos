"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Bug, CalendarDays, Medal, Users, ArrowLeft } from "lucide-react";

const ITEMS = [
  { href: "/admin/dashboard", label: "Santé",           icon: Activity },
  { href: "/admin/users",     label: "Joueurs",         icon: Users },
  { href: "/admin/games",     label: "Matchs",          icon: CalendarDays },
  { href: "/admin/saison",    label: "Paris de saison", icon: Medal },
  { href: "/admin/bugs",      label: "Signalements",    icon: Bug },
] as const;

/** Navigation de l'admin : colonne sur ordinateur, onglets défilants sur mobile. */
export function AdminNav({ openBugs }: { openBugs: number }) {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Administration" className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-[#5096ff]/15 text-[#5096ff]" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {href === "/admin/bugs" && openBugs > 0 && (
              <span className="ml-auto rounded-full bg-[#ff5050] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white tabular-nums">
                {openBugs}
              </span>
            )}
          </Link>
        );
      })}
      <Link
        href="/"
        className="hidden items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-zinc-500 transition-colors hover:text-zinc-300 lg:mt-4 lg:flex"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au site
      </Link>
    </nav>
  );
}
