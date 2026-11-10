import Link from "next/link";
import { LayoutGrid } from "lucide-react";

/**
 * Sur téléphone, en tête des sous-menus NBA (stats, NBA Cup, playoffs) : retour à la page « Stats NBA »
 * qui regroupe tout le contenu NBA. Invisible sur ordinateur.
 */
export function NbaHubLink() {
  return (
    <Link
      href="/nba"
      aria-label="Toutes les stats NBA"
      className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-emerald-400/10 px-2.5 py-2 text-sm font-semibold text-emerald-400 md:hidden"
    >
      <LayoutGrid className="h-4 w-4" />
      <span>Tout</span>
    </Link>
  );
}
