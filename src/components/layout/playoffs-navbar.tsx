"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Network, BarChart2, TrendingUp } from "lucide-react";

export function PlayoffsNavbar() {
  const pathname = usePathname();

  const isActive = (path: string) =>
    path === "/playoffs"
      ? pathname === "/playoffs"
      : pathname === path || pathname?.startsWith(path + "/");

  return (
    <div className="border-b border-zinc-800 bg-zinc-900/50 sticky top-16 z-40 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-1 h-12 overflow-x-auto">
          <Link
            href="/playoffs"
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              isActive("/playoffs")
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <Network className="h-4 w-4" />
            <span>Bracket</span>
          </Link>

          <Link
            href="/playoffs/equipes"
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              isActive("/playoffs/equipes")
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <BarChart2 className="h-4 w-4" />
            <span>Stats équipes</span>
          </Link>

          <Link
            href="/playoffs/joueurs"
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              isActive("/playoffs/joueurs")
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Stats joueurs</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
