"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Award, ClipboardList, Crown, TrendingUp, Trophy, Medal, type LucideIcon } from "lucide-react";
import { getSeasonLabel } from "@/types/season";

/**
 * En haut de chaque page d'une saison passée : tout ce qu'il y avait cette saison.
 * Classement général · Mes pronos · Classement NBA · Leaders · NBA Cup · Playoffs.
 */
export function ArchiveNav({ season }: { season: string }) {
  const pathname = usePathname() ?? "";
  const base = `/archives/${season}`;
  const scrollerRef = useRef<HTMLDivElement>(null);

  const links: { href: string; label: string; icon: LucideIcon; active: boolean }[] = [
    { href: base,               label: "Classement général", icon: Trophy,        active: pathname === base },
    { href: `${base}/pronos`,   label: "Mes pronos",         icon: ClipboardList, active: pathname.startsWith(`${base}/pronos`) },
    { href: `${base}/standings`, label: "Classement NBA",    icon: Medal,         active: pathname.startsWith(`${base}/standings`) },
    { href: `${base}/leaders`,  label: "Leaders",            icon: TrendingUp,    active: pathname.startsWith(`${base}/leaders`) },
    { href: `${base}/nba-cup`,  label: "NBA Cup",            icon: Award,         active: pathname.startsWith(`${base}/nba-cup`) },
    { href: `${base}/playoffs`, label: "Playoffs",           icon: Crown,         active: pathname.startsWith(`${base}/playoffs`) },
  ];

  // Sur téléphone, la barre défile : on garde l'onglet actif visible
  useEffect(() => {
    const box = scrollerRef.current;
    const active = box?.querySelector<HTMLElement>('[aria-current="page"]');
    if (box && active && box.scrollWidth > box.clientWidth) {
      box.scrollLeft = active.offsetLeft - (box.clientWidth - active.offsetWidth) / 2;
    }
  }, [pathname]);

  return (
    <div className="border-b border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950">
      <div className="mx-auto max-w-7xl px-4 pb-3 pt-4 sm:px-6 lg:px-8">
        <Link href="/archives" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Saisons passées
        </Link>
        <p className="mt-1 text-2xl font-black tracking-tight text-white">Saison {getSeasonLabel(season)}</p>

        <div ref={scrollerRef} className="relative -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
          {links.map(({ href, label, icon: Icon, active }) => (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active ? "bg-[#dcff50] text-zinc-950" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
