"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NbaCupNavbar() {
  const pathname = usePathname();

  const isActive = (path: string) =>
    path === "/nba-cup"
      ? pathname === "/nba-cup"
      : pathname === path || pathname?.startsWith(path + "/");

  const links = [
    { href: "/nba-cup",          label: "Bracket"       },
    { href: "/nba-cup/groupes",  label: "Groupes"       },
    { href: "/nba-cup/wildcard", label: "Wild Card"     },
    { href: "/nba-cup/equipes",  label: "Stats équipes" },
    { href: "/nba-cup/joueurs",  label: "Stats joueurs" },
  ];

  return (
    <div className="border-b border-zinc-800 bg-zinc-900/50 sticky top-16 z-40 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-1 h-12 overflow-x-auto">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                isActive(href)
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
