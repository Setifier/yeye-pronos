import Link from "next/link";
import { Clock, Moon, Star, Target, Trophy, Zap, CheckCircle2 } from "lucide-react";
import { PronoseNavbar } from "@/components/layout/pronos-navbar";
import { BONUS_POINTS, MAX_POINTS_POSSIBLE } from "@/types/bonus";
import { MARGIN_OPTIONS } from "@/types/bet";
import { ODDS_STABILIZATION_GAMES } from "@/lib/player-odds";
import { fmtPts } from "@/lib/format";
import {
  NBA_CUP_POINTS, nbaCupChampionPoints, TROPHY_POINTS, STANDINGS_POINTS,
  PRESEASON_BRACKET_POINTS as B,
} from "@/types/special-predictions";

export const metadata = { title: "Règles des pronos · Yeye Pronos" };

const trophyRange = `${TROPHY_POINTS.FIRST} à ${fmtPts(TROPHY_POINTS.MAX)}`;
const roundPoints = (points: number) => `${points} +${Math.round(points * B.GAMES_BONUS)}`;

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

        {/* Paris de début de saison */}
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-black"><Trophy className="h-5 w-5 text-amber-400" /> Paris de début de saison</h2>
              <p className="mt-1 text-sm text-zinc-400">
                À faire une fois, avant le coup d&apos;envoi du premier match de la saison (la date exacte est affichée sur chaque pari).
                Plus ton choix est inattendu, plus il rapporte. Les points s&apos;ajoutent à ton total dès que le résultat est connu.
              </p>
            </div>
            <Link href="/pronos/preseason" className="flex-shrink-0 rounded-xl bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700">Parier →</Link>
          </div>

          <Box title="Trophées" note="La cote affichée au moment du pari est celle qui compte.">
            <PointRow title="Champion NBA Cup" points={`${fmtPts(NBA_CUP_POINTS.FIRST)} à ${fmtPts(nbaCupChampionPoints(30))}`}>
              Selon le bilan de la saison passée : {NBA_CUP_POINTS.FIRST} pts pour la meilleure équipe, +{NBA_CUP_POINTS.STEP} par place. Résultat en décembre.
            </PointRow>
            <PointRow title="MVP" points={trophyRange}>
              Selon le vote MVP de la saison passée, puis l&apos;All-NBA. Un joueur absent des votes est placé d&apos;après ses stats.
            </PointRow>
            <PointRow title="Défenseur de l'année" points={trophyRange}>
              Selon le vote DPOY de la saison passée, puis l&apos;All-Defensive.
            </PointRow>
            <PointRow title="Rookie de l'année" points={trophyRange}>
              Selon l&apos;ordre de la draft : {TROPHY_POINTS.FIRST} pts pour le 1er choix, +{TROPHY_POINTS.STEP} par choix.
            </PointRow>
          </Box>

          <Box title="Classement" note="Seul le palier de bonus le plus haut compte. Résultat à la fin de la saison régulière.">
            <PointRow title="Place exacte" points={`${STANDINGS_POINTS.EXACT}`}>Par équipe.</PointRow>
            <PointRow title="1 place d'écart" points={`${STANDINGS_POINTS.ONE_OFF}`}>Par équipe.</PointRow>
            <PointRow title="Bonus" points={`+${STANDINGS_POINTS.BONUS[STANDINGS_POINTS.BONUS.length - 1].points} à +${fmtPts(STANDINGS_POINTS.BONUS[0].points)}`}>
              {[...STANDINGS_POINTS.BONUS].reverse().map((b) => `${b.teams} places exactes : +${fmtPts(b.points)}`).join(" · ")}
            </PointRow>
          </Box>

          <Box
            title="Bracket"
            note="Les points comptent pour chaque équipe qui passe le tour, même contre un autre adversaire que prévu. Le bonus « bon nombre de matchs » compte seulement si la série prévue a eu lieu."
          >
            <PointRow title="Play-in" points={`${B.PLAYIN_TEAM}`}>Par équipe qualifiée en 7e ou 8e place.</PointRow>
            <PointRow title="1er tour" points={roundPoints(B.R1)}>Par équipe qui passe, + bon nombre de matchs.</PointRow>
            <PointRow title="Demi-finale de conférence" points={roundPoints(B.R2)}>Par équipe qui passe, + bon nombre de matchs.</PointRow>
            <PointRow title="Finale de conférence" points={roundPoints(B.CF)}>Par équipe qui passe, + bon nombre de matchs.</PointRow>
            <PointRow title="Champion NBA" points={roundPoints(B.CHAMPION)}>+ bon nombre de matchs de la Finale.</PointRow>
            <PointRow title="MVP des Finales" points={`${B.FINALS_MVP}`}>Un joueur d&apos;un des deux finalistes.</PointRow>
          </Box>
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

function Box({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
      <h3 className="border-b border-zinc-800 px-5 py-3 text-sm font-semibold">{title}</h3>
      <div className="divide-y divide-zinc-800/80">{children}</div>
      {note && <p className="border-t border-zinc-800 px-5 py-3 text-xs text-zinc-500">{note}</p>}
    </div>
  );
}

function PointRow({ title, points, children }: { title: string; points: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="flex-shrink-0 text-sm font-bold tabular-nums text-[#dcff50]">{points} pts</p>
      </div>
      <p className="mt-0.5 text-sm text-zinc-400">{children}</p>
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
