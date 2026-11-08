"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, Check, Home, Loader2, Target, Trophy, Zap } from "lucide-react";
import { toast } from "sonner";
import type { BetGame } from "@/types/bet";
import { isBettable, missingBets } from "@/types/bet";
import { getCurrentNightDate } from "@/lib/game-night";
import { BetSheet } from "@/components/bets/bet-sheet";
import { refreshHud, useHud } from "@/components/mobile/use-hud";

const LEFT = [
  { href: "/dashboard", label: "Accueil", icon: Home,         match: ["/dashboard"] },
  { href: "/matchs",    label: "Matchs",  icon: CalendarDays, match: ["/matchs"] },
];
const RIGHT = [
  { href: "/classement", label: "Classement", icon: Trophy, match: ["/classement"] },
  { href: "/pronos",     label: "Pronos",     icon: Target, match: ["/pronos"] },
];

/** Pas de barre d'onglets : connexion, profil à compléter, admin, et les deux formulaires avec un bouton « Enregistrer » fixé en bas. */
const HIDDEN_ON = ["/auth", "/onboarding", "/admin", "/pronos/preseason/classement", "/pronos/preseason/bracket"];

interface SheetState {
  games: BetGame[];
  title?: string;
}

/**
 * Barre d'onglets en bas d'écran (mobile, utilisateur connecté).
 * Au centre, le bouton « Parier » : un clic ouvre directement les paris de la nuit qui manquent,
 * depuis n'importe quelle page. Les stats NBA, la NBA Cup, les amis… sont dans le menu (avatar en haut).
 */
export function MobileTabBar() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const hud = useHud();
  const [launching, setLaunching] = useState(false);
  const [sheet, setSheet] = useState<SheetState | null>(null);

  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  const isActive = (prefixes: string[]) => prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const missing = hud?.missing ?? 0;
  const allDone = !!hud && hud.open > 0 && missing === 0;

  const launch = async () => {
    if (launching) return;
    setLaunching(true);
    try {
      const res = await fetch(`/api/bets?date=${getCurrentNightDate()}`);
      if (!res.ok) throw new Error();
      const { games = [] } = (await res.json()) as { games?: BetGame[] };
      const now = Date.now();
      const byDeadline = (a: BetGame, b: BetGame) => a.predictionDeadline.localeCompare(b.predictionDeadline);
      const todo = missingBets(games, now).sort(byDeadline);
      const open = games.filter((g) => isBettable(g, now)).sort(byDeadline);
      if (todo.length > 0) {
        setSheet({ games: todo });
      } else if (open.length > 0) {
        toast.success("Tous tes paris de la nuit sont faits", { description: "Tu peux encore ajouter des bonus.", duration: 2500 });
        setSheet({ games: open, title: "Mes paris de la nuit" });
      } else {
        toast("Plus de pari ouvert cette nuit", { description: "Les prochains matchs sont dans le calendrier.", duration: 2500 });
        router.push("/matchs");
      }
    } catch {
      toast.error("Impossible de charger les matchs de la nuit");
    } finally {
      setLaunching(false);
    }
  };

  const tab = ({ href, label, icon: Icon, match }: (typeof LEFT)[number]) => {
    const active = isActive(match);
    return (
      <Link
        key={href}
        href={href}
        className={`flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors ${
          active ? "text-white" : "text-zinc-500 active:text-zinc-300"
        }`}
      >
        <span className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${active ? "bg-[#5096ff]/20" : ""}`}>
          <Icon className={`h-5 w-5 ${active ? "text-[#5096ff] stroke-[2.5]" : ""}`} />
        </span>
        {label}
      </Link>
    );
  };

  return (
    <>
      <div className="md:hidden" style={{ height: "calc(4.5rem + env(safe-area-inset-bottom))" }} aria-hidden />
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid h-[4.5rem] max-w-md grid-cols-5">
          {LEFT.map(tab)}

          {/* Bouton central « Parier » */}
          <div className="relative flex justify-center">
            <button
              type="button"
              onClick={launch}
              aria-label={missing > 0 ? `Parier : ${missing} pari${missing > 1 ? "s" : ""} à faire` : "Parier"}
              className="absolute -top-6 flex flex-col items-center gap-1"
            >
              <span className="relative flex h-16 w-16 items-center justify-center">
                {missing > 0 && <span className="absolute inset-1 animate-ping rounded-full bg-[#ff5050]/40" />}
                <span
                  className={`relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-zinc-950 shadow-lg transition-transform active:scale-90 ${
                    missing > 0
                      ? "bg-gradient-to-br from-[#ff6a5a] to-[#ff3b3b] shadow-[#ff5050]/40"
                      : "bg-gradient-to-br from-[#5096ff] to-[#3a6fe0] shadow-[#5096ff]/30"
                  }`}
                >
                  {launching ? <Loader2 className="h-7 w-7 animate-spin text-white" /> : <Zap className="h-7 w-7 fill-white text-white" />}
                </span>
                {missing > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-zinc-950 bg-[#dcff50] px-1 text-xs font-black text-zinc-950">
                    {missing}
                  </span>
                )}
                {allDone && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-zinc-950 bg-emerald-400">
                    <Check className="h-3.5 w-3.5 stroke-[3] text-zinc-950" />
                  </span>
                )}
              </span>
              <span className={`text-[10px] font-bold ${missing > 0 ? "text-[#ff5050]" : "text-zinc-300"}`}>Parier</span>
            </button>
          </div>

          {RIGHT.map(tab)}
        </div>
      </nav>

      {sheet && (
        <BetSheet
          games={sheet.games}
          title={sheet.title}
          onClose={() => { setSheet(null); refreshHud(true); }}
          onPredictionChange={() => { /* les pages suivent via l'événement de hooks.ts */ }}
        />
      )}
    </>
  );
}
