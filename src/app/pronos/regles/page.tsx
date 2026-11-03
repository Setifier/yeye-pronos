import Link from "next/link";
import { Clock, Moon, Star, Target, Trophy, Zap, CheckCircle2 } from "lucide-react";
import { PronoseNavbar } from "@/components/layout/pronos-navbar";
import { BONUS_POINTS, MAX_POINTS_POSSIBLE } from "@/types/bonus";
import { MARGIN_OPTIONS } from "@/types/bet";
import { ODDS_STABILIZATION_GAMES } from "@/lib/player-odds";

export const metadata = { title: "Règles des pronos · Yeye Pronos" };

export default function ReglesPage() {
  return (
    <div className="min-h-screen bg-zinc-950 pb-12 text-white">
      <PronoseNavbar />

      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <header>
          <h1 className="text-2xl font-black tracking-tight">Règles du jeu</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Un prono par match : choisis le vainqueur, et si tu veux, ajoute des bonus pour gagner plus. Un bonus raté ne retire jamais de points.
          </p>
        </header>

        {/* Barème */}
        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
          <h2 className="border-b border-zinc-800 px-5 py-3 text-sm font-semibold">Barème d&apos;un match</h2>
          <div className="divide-y divide-zinc-800/80">
            <Row icon={<CheckCircle2 className="h-4 w-4 text-[#5096ff]" />} title="Bonne équipe" points={`${BONUS_POINTS.BASE} pts`}>
              Tu trouves le vainqueur du match.
            </Row>
            <Row icon={<Target className="h-4 w-4 text-[#5096ff]" />} title="Bon écart" points={`+${BONUS_POINTS.MARGIN_EXACT} pts`}>
              Tu trouves l&apos;écart final : {MARGIN_OPTIONS.map((m) => m.key === "OVERTIME" ? "prolongation" : m.short).join(" · ")} pts.
              Compte seulement si ton équipe gagne.
            </Row>
            <Row icon={<Star className="h-4 w-4 text-[#5096ff]" />} title="Meilleur marqueur" points={`+(${BONUS_POINTS.TOP_SCORER_BASE} − sa moyenne)`}>
              Tu trouves le joueur qui marque le plus de points du match. Plus il est inattendu, plus il rapporte :
              un joueur à 30 pts/match rapporte 10 pts, un joueur à 8 pts/match en rapporte 32.
              Compte même si ton équipe perd.
            </Row>
            <Row icon={<Zap className="h-4 w-4 text-purple-400" />} title="Combo" points={`+${BONUS_POINTS.COMBO_PERFECT} pts`}>
              Équipe, écart et meilleur marqueur tous justes.
            </Row>
          </div>
          <p className="border-t border-zinc-800 px-5 py-3 text-xs text-zinc-500">Maximum : {MAX_POINTS_POSSIBLE} pts par match.</p>
        </section>

        {/* Exemples */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h2 className="mb-3 text-sm font-semibold">Exemples</h2>
          <ul className="space-y-2 text-sm text-zinc-300">
            <li><b className="text-white">Bonne équipe seule</b> → 10 pts</li>
            <li><b className="text-white">Bonne équipe + bon écart</b> → 10 + 10 = 20 pts</li>
            <li><b className="text-white">Mauvaise équipe, mais bon meilleur marqueur (22 pts/match)</b> → 18 pts</li>
            <li><b className="text-white">Tout juste avec un marqueur à 25 pts/match</b> → 10 + 10 + 15 + 20 = 55 pts</li>
          </ul>
        </section>

        {/* Horaires */}
        <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h2 className="text-sm font-semibold">Heures limites et dates</h2>
          <Info icon={<Clock className="h-4 w-4 text-amber-400" />}>
            Les pronos ferment <b className="text-white">au coup d&apos;envoi du match</b>. Jusque-là, tu peux changer d&apos;équipe ou de bonus autant que tu veux.
          </Info>
          <Info icon={<Moon className="h-4 w-4 text-[#5096ff]" />}>
            Les matchs sont rangés par <b className="text-white">nuit NBA</b> : le match du mardi 28 à New York se joue dans la nuit du mardi 28 au mercredi 29 à Paris.
            Toutes les heures affichées sont en heure de Paris.
          </Info>
          <Info icon={<Star className="h-4 w-4 text-[#dcff50]" />}>
            Début de saison : tant qu&apos;un joueur a moins de {ODDS_STABILIZATION_GAMES} matchs, sa moyenne mélange cette saison et la précédente,
            pour que les stars n&apos;aient pas une cote maximale en octobre. La cote affichée est celle utilisée pour le calcul.
          </Info>
        </section>

        {/* Paris de saison */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Trophy className="h-4 w-4 text-amber-400" /> Paris de saison</h2>
          <p className="text-sm text-zinc-400">
            En plus des matchs : champion NBA Cup, MVP, classement final, bracket des playoffs, puis un pari à chaque tour des playoffs.
            Leurs points s&apos;ajoutent à ton total de la saison. Les paris de début de saison ferment au coup d&apos;envoi
            du premier match de la saison (la date exacte est affichée sur chaque pari).
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/pronos/preseason" className="rounded-xl bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700">Début de saison →</Link>
            <Link href="/pronos/postseason" className="rounded-xl bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700">Play-in & Playoffs →</Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ icon, title, points, children }: { icon: React.ReactNode; title: string; points: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 px-5 py-4">
      <span className="mt-0.5">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="flex-shrink-0 text-sm font-bold text-[#dcff50]">{points}</p>
        </div>
        <p className="mt-0.5 text-sm text-zinc-400">{children}</p>
      </div>
    </div>
  );
}

function Info({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="flex gap-3 text-sm text-zinc-400">
      <span className="mt-0.5 flex-shrink-0">{icon}</span>
      <span>{children}</span>
    </p>
  );
}
