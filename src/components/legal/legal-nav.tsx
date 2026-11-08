"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LEGAL_PAGES = [
  { href: "/legal/mentions",        label: "Mentions légales" },
  { href: "/legal/confidentialite", label: "Confidentialité" },
  { href: "/legal/cgu",             label: "Conditions d’utilisation" },
] as const;

/** Onglets entre les trois pages légales. */
export function LegalNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Pages légales">
      {LEGAL_PAGES.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              active
                ? "bg-[#5096ff]/15 text-[#5096ff]"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
