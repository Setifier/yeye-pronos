"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NbaHubLink } from "./nba-hub-link";
import { useArchiveSeason, useSeasonHref } from "@/components/archives/season-context";

/** Sous-menu NBA Cup. Dans une saison passée (archives), les liens restent dans cette saison. */
export function NbaCupNavbar() {
  const pathname = usePathname();
  const archive = useArchiveSeason();
  const href = useSeasonHref();

  const isActive = (path: string) => {
    const full = href(path);
    return path === "/nba-cup"
      ? pathname === full
      : pathname === full || pathname?.startsWith(full + "/");
  };

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
        {/* justify-start sur téléphone : centré + défilant, le 1er lien serait coupé à gauche */}
        <div className="flex h-12 items-center justify-start gap-1 overflow-x-auto [scrollbar-width:none] md:justify-center">
          {!archive && <NbaHubLink />}
          {links.map((link) => (
            <Link
              key={link.href}
              href={href(link.href)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                isActive(link.href)
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
