/**
 * Correction d'urgence des équipes joueurs
 *
 * Problème : seed-players.ts utilise des IDs ESPN 1-30 pour matcher les équipes
 * en DB, mais les externalId en DB viennent de BallDontLie (numérotation différente).
 * Résultat : ESPN team 3 (New Orleans) → matched à BallDontLie team 3 (Brooklyn) → mauvaise équipe.
 *
 * Solution : on prend l'ABRÉVIATION directement dans la réponse du roster ESPN,
 * on la normalise (même table que espn-stats.ts), et on cherche l'équipe en DB par abbr.
 * L'abréviation est l'identifiant stable et non ambigu entre toutes les APIs.
 *
 * Ce script NE touche PAS aux agents libres — il corrige uniquement les teamId.
 *
 * Usage : npm run db:fix-player-teams
 */

import { prisma } from "../src/lib/prisma";

// Même map que espn-stats.ts
const ESPN_ABBR_TO_DB: Record<string, string> = {
  UTAH: "UTA",
  GS:   "GSW",
  SA:   "SAS",
  NY:   "NYK",
  NO:   "NOP",
  WSH:  "WAS",
};

function normalizeAbbr(espnAbbr: string): string {
  return ESPN_ABBR_TO_DB[espnAbbr.toUpperCase()] ?? espnAbbr.toUpperCase();
}

function normalizePosition(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const p = raw.toUpperCase().trim();
  if (p === "PG" || p === "SG") return "G";
  if (p === "SF" || p === "PF") return "F";
  if (p === "G" || p === "F" || p === "C") return p;
  return raw;
}

interface ESPNAthlete {
  id:          string;
  displayName: string;
  firstName?:  string;
  lastName?:   string;
  jersey?:     string;
  position?:   { abbreviation?: string };
}

interface ESPNRosterResponse {
  team?:     { id: string; abbreviation: string; displayName: string };
  athletes?: ESPNAthlete[];
  roster?:   { entries?: Array<{ athlete: ESPNAthlete }> };
}

async function fetchRoster(
  espnTeamId: number
): Promise<{ abbr: string | null; athletes: ESPNAthlete[] }> {
  try {
    const res = await fetch(
      `http://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${espnTeamId}/roster`
    );
    if (!res.ok) return { abbr: null, athletes: [] };

    const data = (await res.json()) as ESPNRosterResponse;

    // Abréviation directement dans la réponse — source de vérité
    const rawAbbr = data.team?.abbreviation ?? null;
    const abbr    = rawAbbr ? normalizeAbbr(rawAbbr) : null;

    let athletes: ESPNAthlete[] = [];
    if (Array.isArray(data.athletes) && data.athletes.length > 0) {
      athletes = data.athletes;
    } else if (data.roster?.entries && data.roster.entries.length > 0) {
      athletes = data.roster.entries.map((e) => e.athlete);
    }

    return { abbr, athletes };
  } catch {
    return { abbr: null, athletes: [] };
  }
}

async function main() {
  console.log("═".repeat(60));
  console.log("🔧  CORRECTION DES ÉQUIPES JOUEURS");
  console.log("   (matching par abréviation, sans cleanup)");
  console.log("═".repeat(60));

  // Index DB teams par abréviation — source stable
  const dbTeams    = await prisma.team.findMany({ select: { id: true, abbreviation: true, name: true } });
  const teamByAbbr = new Map(dbTeams.map((t) => [t.abbreviation, t]));
  console.log(`\n📋 ${dbTeams.length} équipes en DB\n`);

  let totalUpdated = 0;
  let totalCreated = 0;
  let teamsOk      = 0;
  let teamsSkipped = 0;

  // ESPN utilise des IDs entre 1 et ~32 pour les franchises NBA
  for (let espnId = 1; espnId <= 35; espnId++) {
    const { abbr, athletes } = await fetchRoster(espnId);

    if (!abbr || athletes.length === 0) {
      // ESPN ID inexistant ou équipe vide → normal pour certains IDs
      continue;
    }

    const dbTeam = teamByAbbr.get(abbr);
    if (!dbTeam) {
      console.warn(`⚠️  "${abbr}" (ESPN ID ${espnId}) introuvable en DB — skip`);
      teamsSkipped++;
      await new Promise((r) => setTimeout(r, 300));
      continue;
    }

    console.log(`✅  ${dbTeam.abbreviation} — ${dbTeam.name} (ESPN ID ${espnId}, ${athletes.length} joueurs)`);
    teamsOk++;

    for (const a of athletes) {
      const firstName    = (a.firstName || a.displayName.split(" ")[0]  || "Unknown").trim();
      const lastName     = (a.lastName  || a.displayName.split(" ").slice(1).join(" ") || "Unknown").trim();
      const fullName     = `${firstName} ${lastName}`;
      const position     = normalizePosition(a.position?.abbreviation);
      const jerseyNumber = a.jersey ?? null;
      const headshot     = `https://a.espncdn.com/i/headshots/nba/players/full/${a.id}.png`;

      try {
        const existing = await prisma.player.findUnique({
          where:  { externalId: a.id },
          select: { id: true },
        });

        if (existing) {
          await prisma.player.update({
            where: { id: existing.id },
            data:  { firstName, lastName, fullName, position, jerseyNumber, teamId: dbTeam.id, headshot },
          });
          totalUpdated++;
        } else {
          await prisma.player.create({
            data: { externalId: a.id, firstName, lastName, fullName, position, jerseyNumber, teamId: dbTeam.id, headshot },
          });
          totalCreated++;
          console.log(`   ➕ Nouveau : ${fullName}`);
        }
      } catch (err) {
        console.error(`   ❌ ${fullName} (${a.id}):`, err);
      }
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("\n" + "─".repeat(60));
  console.log(`📊  ${teamsOk} équipes corrigées · ${teamsSkipped} ignorées`);
  console.log(`    ${totalUpdated} joueurs mis à jour · ${totalCreated} créés`);

  // Vérification rapide
  const sample = await prisma.player.findMany({
    where:   { teamId: { not: null } },
    include: { team: { select: { abbreviation: true } } },
    take:    10,
    orderBy: { fullName: "asc" },
  });
  console.log("\n🔍 Vérification (10 joueurs) :");
  for (const p of sample) {
    console.log(`   ${p.fullName.padEnd(25)} → ${p.team?.abbreviation ?? "?"}`);
  }

  console.log("\n" + "═".repeat(60));
  console.log("✅  Correction terminée. Vérifie les effectifs dans l'app.");
  console.log("═".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error("❌ Erreur fatale:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
