"use client";

import { useEffect, useRef } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

export interface StatTab {
  key: string;
  /** Libellé court de l'onglet (« Points », « PD », « REB »…) */
  tab: string;
}

/**
 * Onglets des statistiques joueurs (Leaders, NBA Cup, Playoffs), collés sous les sous-menus.
 * Téléphone : une seule ligne qui défile, l'onglet actif ramené au milieu (avant : deux lignes centrées
 * plus larges que l'écran, coupées des deux côtés). Ordinateur (md+) : les deux lignes centrées, inchangées.
 * Un 2e toucher sur l'onglet actif inverse le tri (flèche).
 */
export function StatTabs({
  categories,
  active,
  dir,
  onSelect,
  activeClass,
  stickyTop = "top-[calc(4rem+3rem)]",
}: {
  categories: StatTab[];
  active: string;
  dir: "desc" | "asc";
  onSelect: (key: string) => void;
  /** Couleur de l'onglet actif, ex. « bg-orange-500 text-white » */
  activeClass: string;
  /** Sous la barre du haut (4rem) + le sous-menu (3rem) ; « top-16 » s'il n'y a pas de sous-menu */
  stickyTop?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = scrollerRef.current;
    const el = box?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (box && el && box.scrollWidth > box.clientWidth) {
      box.scrollLeft = el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2;
    }
  }, [active]);

  const button = (cat: StatTab) => {
    const isActive = active === cat.key;
    return (
      <button
        key={cat.key}
        type="button"
        onClick={() => onSelect(cat.key)}
        aria-pressed={isActive}
        className={`inline-flex flex-shrink-0 items-center gap-0.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
          isActive ? activeClass : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
        }`}
      >
        {cat.tab}
        {isActive && (dir === "desc"
          ? <ArrowDown className="h-3 w-3 flex-shrink-0" />
          : <ArrowUp className="h-3 w-3 flex-shrink-0" />)}
      </button>
    );
  };

  return (
    <div className={`sticky ${stickyTop} z-30 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm`}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Téléphone : une ligne qui défile */}
        <div
          ref={scrollerRef}
          className="relative -mx-4 flex gap-1 overflow-x-auto px-4 py-1.5 [scrollbar-width:none] sm:-mx-6 sm:px-6 md:hidden"
        >
          {categories.map(button)}
        </div>
        {/* Ordinateur : deux lignes centrées */}
        <div className="hidden space-y-1 py-1.5 md:block">
          <div className="flex justify-center gap-1">{categories.slice(0, 11).map(button)}</div>
          <div className="flex justify-center gap-1">{categories.slice(11).map(button)}</div>
        </div>
      </div>
    </div>
  );
}
