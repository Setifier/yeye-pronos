import Link from "next/link";
import { Award, Crown, Medal, Star, Target, Trophy, Users, type LucideIcon } from "lucide-react";
import { AwardHeadshot } from "@/components/awards/award-headshot";
import { getTeamLogo } from "@/lib/nba-logos";
import { NBA_AWARDS, NBA_AWARD_GROUPS, type NbaAwardDef, type NbaAwardGroup, type NbaAwardWinner } from "@/types/nba-awards";
import { getSeasonLabel } from "@/types/season";

const GROUP_ICONS: Record<NbaAwardGroup, LucideIcon> = {
  season: Trophy,
  playoffs: Crown,
  teams: Users,
  cup: Award,
  allstar: Star,
};

/**
 * Trophées NBA d'une saison (serveur) : trophées individuels, playoffs, équipes de la saison, NBA Cup, All-Star.
 * Saison en cours : les trophées pas encore décernés affichent « À venir » et quand ils tombent ;
 * ceux des paris de début de saison portent un badge.
 */
export function NbaAwardsView({ season, winners, current }: { season: string; winners: NbaAwardWinner[]; current: boolean }) {
  const byAward = new Map<string, NbaAwardWinner[]>();
  for (const w of winners) byAward.set(w.award, [...(byAward.get(w.award) ?? []), w]);
  const decided = NBA_AWARDS.filter((a) => byAward.has(a.key)).length;

  return (
    <div className="mx-auto max-w-5xl space-y-7 px-4 py-5 sm:px-6 md:py-8 lg:px-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-white md:text-3xl">
          <Medal className="h-6 w-6 text-amber-400" /> Trophées NBA
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Saison {getSeasonLabel(season)} · {decided}/{NBA_AWARDS.length} décernés
          {current && decided < NBA_AWARDS.length && " · mis à jour chaque jour pendant les annonces"}
        </p>
      </div>

      {NBA_AWARD_GROUPS.map(({ key, label }) => {
        const defs = NBA_AWARDS.filter((a) => a.group === key);
        const Icon = GROUP_ICONS[key];
        return (
          <section key={key}>
            <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
              <Icon className="h-4 w-4" /> {label}
            </h2>
            <div className={`grid gap-2.5 ${key === "teams" ? "md:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
              {defs.map((def) =>
                def.team
                  ? <TeamAward key={def.key} def={def} winners={byAward.get(def.key) ?? []} current={current} />
                  : <SingleAward key={def.key} def={def} winner={byAward.get(def.key)?.[0] ?? null} current={current} />
              )}
            </div>
          </section>
        );
      })}

      <p className="text-center text-[11px] text-zinc-600">Source : ESPN · entraîneur de l&apos;année saisi par l&apos;administrateur</p>
    </div>
  );
}

function Pending({ def, current }: { def: NbaAwardDef; current: boolean }) {
  return (
    <p className="text-sm text-zinc-500">
      {current ? <>À venir · <span className="text-zinc-400">{def.when}</span></> : "Non disponible"}
    </p>
  );
}

function BetBadge({ current }: { current: boolean }) {
  const cls = "inline-flex items-center gap-1 rounded-full bg-[#dcff50]/10 px-2 py-0.5 text-[10px] font-bold text-[#dcff50]";
  return current ? (
    <Link href="/pronos/preseason" className={`${cls} hover:bg-[#dcff50]/20`}><Target className="h-3 w-3" /> Pari de saison</Link>
  ) : (
    <span className={cls}><Target className="h-3 w-3" /> Pari de saison</span>
  );
}

function TeamTag({ abbr }: { abbr: string | null }) {
  if (!abbr) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={getTeamLogo(abbr)} alt="" className="h-3.5 w-3.5 object-contain" />
      {abbr}
    </span>
  );
}

/** Lien vers la fiche NBA du joueur s'il est dans la base. */
function PlayerLink({ winner, children, className }: { winner: NbaAwardWinner; children: React.ReactNode; className: string }) {
  return winner.playerId ? (
    <Link href={`/joueurs/${winner.playerId}`} className={`${className} transition-colors hover:border-zinc-700 hover:bg-zinc-900`}>{children}</Link>
  ) : (
    <div className={className}>{children}</div>
  );
}

function SingleAward({ def, winner, current }: { def: NbaAwardDef; winner: NbaAwardWinner | null; current: boolean }) {
  const box = "flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3";
  const body = (
    <>
      {winner ? (
        <AwardHeadshot name={winner.name} src={winner.headshot} size={56} />
      ) : (
        <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border border-dashed border-zinc-700 text-zinc-600">
          <Trophy className="h-5 w-5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">{def.label}</p>
          {def.bet && <BetBadge current={current} />}
        </div>
        {winner ? (
          <>
            <p className="truncate text-base font-black text-white">{winner.name}</p>
            <TeamTag abbr={winner.teamAbbr} />
          </>
        ) : (
          <Pending def={def} current={current} />
        )}
      </div>
    </>
  );
  return winner ? <PlayerLink winner={winner} className={box}>{body}</PlayerLink> : <div className={box}>{body}</div>;
}

function TeamAward({ def, winners, current }: { def: NbaAwardDef; winners: NbaAwardWinner[]; current: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
      <p className="border-b border-zinc-800/80 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-amber-400">{def.label}</p>
      {winners.length === 0 ? (
        <div className="px-3 py-3"><Pending def={def} current={current} /></div>
      ) : (
        <ul className="divide-y divide-zinc-800/60">
          {winners.map((w) => (
            <li key={`${w.rank}-${w.name}`}>
              <PlayerLink winner={w} className="flex items-center gap-2.5 border border-transparent px-3 py-2">
                <AwardHeadshot name={w.name} src={w.headshot} size={32} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{w.name}</span>
                <TeamTag abbr={w.teamAbbr} />
              </PlayerLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
