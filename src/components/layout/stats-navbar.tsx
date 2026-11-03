"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Trophy, TrendingUp, HeartPulse, Award, Crown } from "lucide-react";

const LINKS = [
  { href: "/standings",           label: "Classement NBA", icon: Trophy,     exact: true },
  { href: "/leaders",             label: "Leaders",        icon: TrendingUp, exact: true },
  { href: "/joueurs",             label: "Joueurs",        icon: Users,      exact: false },
  { href: "/joueurs/infirmerie",  label: "Infirmerie",     icon: HeartPulse, exact: true },
  { href: "/nba-cup",             label: "NBA Cup",        icon: Award,      exact: false },
  { href: "/playoffs",            label: "Playoffs",       icon: Crown,      exact: false },
];

export function StatsNavbar() {
  const pathname = usePathname() ?? "";

  const isActive = (href: string, exact: boolean) => {
    if (href === "/joueurs") {
      // "Joueurs" actif sur /joueurs et les fiches, mais pas sur l'infirmerie
      return pathname === "/joueurs" || (pathname.startsWith("/joueurs/") && !pathname.startsWith("/joueurs/infirmerie"));
    }
    return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="sticky top-16 z-20 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-12 items-center justify-start gap-1 overflow-x-auto lg:justify-center">
          {LINKS.map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(href, exact) ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
