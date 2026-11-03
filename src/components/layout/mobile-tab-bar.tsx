"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, Target, Trophy, BarChart3 } from "lucide-react";

const TABS = [
  { href: "/dashboard",  label: "Accueil",    icon: Home,         match: ["/dashboard"] },
  { href: "/matchs",     label: "Matchs",     icon: CalendarDays, match: ["/matchs"] },
  { href: "/pronos",     label: "Pronos",     icon: Target,       match: ["/pronos"] },
  { href: "/classement", label: "Classement", icon: Trophy,       match: ["/classement"] },
  { href: "/standings",  label: "Stats NBA",  icon: BarChart3,    match: ["/standings", "/leaders", "/joueurs", "/joueur", "/nba-cup", "/playoffs", "/archives"] },
];

/** Barre d'onglets fixe en bas d'écran (mobile uniquement, utilisateur connecté). */
export function MobileTabBar() {
  const pathname = usePathname() ?? "";
  const isActive = (prefixes: string[]) => prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (pathname.startsWith("/auth") || pathname.startsWith("/onboarding") || pathname.startsWith("/admin")) return null;

  return (
    <>
      <div className="h-16 md:hidden" aria-hidden />
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid h-16 max-w-md grid-cols-5">
          {TABS.map(({ href, label, icon: Icon, match }) => {
            const active = isActive(match);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${
                  active ? "text-[#5096ff]" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
