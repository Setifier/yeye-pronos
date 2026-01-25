"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Users, Trophy } from "lucide-react";

export function StatsNavbar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/joueurs") {
      return pathname === "/joueurs" || pathname?.startsWith("/joueurs/");
    }
    return pathname === path;
  };

  return (
    <div className="border-b border-zinc-800 bg-zinc-900/50 sticky top-16 z-40 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-1 h-12 overflow-x-auto">
          <Link
            href="/standings"
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              isActive("/standings")
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <Trophy className="h-4 w-4" />
            <span>Classement NBA</span>
          </Link>

          <Link
            href="/joueurs"
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              isActive("/joueurs")
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Joueurs</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
