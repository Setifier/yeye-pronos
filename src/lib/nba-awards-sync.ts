/**
 * Trophées NBA d'une saison depuis ESPN → table NbaAward (serveur).
 *
 * Source : https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/seasons/{année}/awards
 *   - {année} = année de fin de saison : 2025-26 → 2026
 *   - un trophée pas encore décerné n'a pas de lauréat (ou n'est pas dans la liste)
 *   - l'entraîneur de l'année n'est pas publié par ESPN : saisi dans l'admin (source « ADMIN »)
 *
 * Idempotent : un trophée n'est réécrit que si ses lauréats ont changé. Lancé par le CRON quotidien
 * (/api/cron/nba-awards), le bouton de l'admin et `npm run db:sync-awards -- --season=2025-26`.
 *
 * Trophées des paris de saison (MVP, DPOY, Rookie, MVP des Finales) : reportés dans SeasonAwardResult
 * s'ils n'y sont pas encore (une saisie de l'admin n'est jamais remplacée), pour noter les paris.
 */

import type { PrismaClient } from "@/generated/prisma";
import { fetchEspnTeams } from "@/lib/roster-sync";
import { NBA_AWARDS } from "@/types/nba-awards";
import { getSeasonStartYear } from "@/types/season";

const CORE = "https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba";

export interface AwardsSyncResult {
  /** Trophées décernés trouvés chez ESPN */
  found: number;
  /** Trophées nouveaux ou modifiés cette fois-ci (libellés) */
  changed: string[];
  /** Trophées des paris de saison reportés dans SeasonAwardResult */
  betAwardsSet: string[];
  /** Lauréats absents de notre base (nom affiché quand même, sans lien vers une fiche) */
  notInDb: string[];
}

interface EspnRef { $ref?: string }
interface EspnAward { winners?: Array<{ athlete?: EspnRef; team?: EspnRef }> }
interface EspnAthlete { displayName?: string; fullName?: string; headshot?: { href?: string } }

async function getJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url.replace(/^http:\/\//, "https://"), { signal: AbortSignal.timeout(12_000), cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`ESPN ${res.status} : ${url}`);
  return (await res.json()) as T;
}

const idFrom = (ref: string | undefined, kind: "athletes" | "teams") =>
  ref?.match(new RegExp(`/${kind}/(\\d+)`))?.[1] ?? null;

async function inBatches<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  return out;
}

export async function syncNbaAwards(
  prisma: PrismaClient,
  season: string,
  { log = () => {} }: { log?: (m: string) => void } = {}
): Promise<AwardsSyncResult> {
  const espnYear = getSeasonStartYear(season) + 1;
  const result: AwardsSyncResult = { found: 0, changed: [], betAwardsSet: [], notInDb: [] };

  // 1. Trophées publiés pour cette saison
  const list = await getJson<{ items?: EspnRef[] }>(`${CORE}/seasons/${espnYear}/awards?limit=100`);
  const published = new Set((list?.items ?? []).map((i) => Number(i.$ref?.match(/\/awards\/(\d+)/)?.[1])));
  const wanted = NBA_AWARDS.filter((a) => a.espnId !== null && published.has(a.espnId));

  // 2. Lauréats de chaque trophée (ordre ESPN conservé : rang dans l'équipe)
  const awards = await inBatches(wanted, 6, async (def) => {
    // Une erreur ESPN sur un trophée n'empêche pas d'enregistrer les autres (nouvel essai au passage suivant)
    const data = await getJson<EspnAward>(`${CORE}/seasons/${espnYear}/awards/${def.espnId}`).catch((err: unknown) => {
      log(`   ⚠️  ${def.label} : ${err instanceof Error ? err.message : String(err)}`);
      return null;
    });
    const winners = (data?.winners ?? [])
      .map((w) => ({ athleteId: idFrom(w.athlete?.$ref, "athletes"), teamId: idFrom(w.team?.$ref, "teams") }))
      .filter((w): w is { athleteId: string; teamId: string | null } => !!w.athleteId);
    return { def, winners };
  });
  const decided = awards.filter((a) => a.winners.length > 0);
  result.found = decided.length;
  log(`🏆 Trophées NBA ${season} : ${decided.length} décerné(s) sur ESPN`);
  if (decided.length === 0) return result;

  // 3. Joueurs de la base (Player.externalId = identifiant ESPN), équipes ESPN → abréviations
  const athleteIds = [...new Set(decided.flatMap((a) => a.winners.map((w) => w.athleteId)))];
  const [players, espnTeams] = await Promise.all([
    prisma.player.findMany({
      where:  { externalId: { in: athleteIds } },
      select: { id: true, externalId: true, fullName: true, headshot: true },
    }),
    fetchEspnTeams().catch(() => []),
  ]);
  const playerByEspn = new Map(players.map((p) => [p.externalId, p]));
  const abbrByEspnTeam = new Map(espnTeams.map((t) => [t.espnId, t.abbr]));

  // Lauréats absents de la base (retraités, partis hors NBA…) : nom et photo lus chez ESPN
  const missing = athleteIds.filter((id) => !playerByEspn.has(id));
  const fetched = new Map<string, { name: string; headshot: string | null }>();
  await inBatches(missing, 6, async (id) => {
    const a = await getJson<EspnAthlete>(`${CORE}/seasons/${espnYear}/athletes/${id}`).catch(() => null);
    const name = a?.displayName ?? a?.fullName;
    if (name) fetched.set(id, { name, headshot: a?.headshot?.href ?? null });
  });

  // 4. Écriture, trophée par trophée, seulement si les lauréats ont changé
  const existing = await prisma.nbaAward.findMany({
    where:  { season, source: "ESPN" },
    select: { award: true, rank: true, espnAthleteId: true },
  });
  const current = new Map<string, string>();
  for (const e of [...existing].sort((a, b) => a.rank - b.rank)) {
    current.set(e.award, `${current.get(e.award) ?? ""}${e.espnAthleteId},`);
  }

  for (const { def, winners } of decided) {
    const signature = winners.map((w) => `${w.athleteId},`).join("");
    if (current.get(def.key) === signature) continue;

    const rows = winners.map((w, i) => {
      const player = playerByEspn.get(w.athleteId);
      const outside = fetched.get(w.athleteId);
      if (!player) result.notInDb.push(outside?.name ?? `ESPN #${w.athleteId}`);
      return {
        season,
        award: def.key,
        // Équipe : 1 à 5 ; trophée individuel : 0 (1, 2… en cas d'ex æquo)
        rank: def.team ? i + 1 : i,
        name: player?.fullName ?? outside?.name ?? `Joueur ESPN #${w.athleteId}`,
        // L'équipe du All-Star Game n'est pas une équipe NBA : pas d'abréviation
        teamAbbr: (w.teamId && abbrByEspnTeam.get(w.teamId)) || null,
        headshot: player?.headshot ?? outside?.headshot ?? `https://a.espncdn.com/i/headshots/nba/players/full/${w.athleteId}.png`,
        espnAthleteId: w.athleteId,
        source: "ESPN",
        playerId: player?.id ?? null,
      };
    });

    await prisma.$transaction([
      prisma.nbaAward.deleteMany({ where: { season, award: def.key } }),
      prisma.nbaAward.createMany({ data: rows }),
    ]);
    result.changed.push(def.label);
    log(`   ✓ ${def.label} : ${rows.map((r) => r.name).join(", ")}`);
  }

  // 5. Trophées des paris de saison → SeasonAwardResult (jamais à la place d'une saisie de l'admin)
  const betDefs = decided.filter((a) => a.def.bet && !a.def.team);
  if (betDefs.length > 0) {
    const already = new Set(
      (await prisma.seasonAwardResult.findMany({ where: { season }, select: { award: true } })).map((r) => r.award)
    );
    for (const { def, winners } of betDefs) {
      const player = playerByEspn.get(winners[0].athleteId);
      if (!def.bet || already.has(def.bet) || !player) continue;
      await prisma.seasonAwardResult.create({ data: { season, award: def.bet, playerId: player.id } });
      result.betAwardsSet.push(def.label);
      log(`   🎯 ${def.label} reporté pour la notation des paris de saison : ${player.fullName}`);
    }
  }

  if (result.notInDb.length) log(`   ℹ️  Lauréats hors de la base (affichés sans fiche) : ${result.notInDb.join(", ")}`);
  return result;
}
