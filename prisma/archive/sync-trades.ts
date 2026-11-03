/**
 * Synchronisation des trades/transactions NBA depuis ESPN
 *
 * Usage: npx tsx prisma/sync-trades.ts
 *
 * Options:
 * --from=YYYY-MM-DD : Date de debut (defaut: 7 jours avant)
 * --to=YYYY-MM-DD   : Date de fin (defaut: aujourd'hui)
 * --dry-run         : Affiche les changements sans modifier la DB
 */

import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

const ESPN_TRANSACTIONS_API =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/transactions";

// Mapping des noms d'equipes ESPN vers les abbreviations
const TEAM_NAME_TO_ABBR: Record<string, string> = {
  "Atlanta Hawks": "ATL",
  "Boston Celtics": "BOS",
  "Brooklyn Nets": "BKN",
  "Charlotte Hornets": "CHA",
  "Chicago Bulls": "CHI",
  "Cleveland Cavaliers": "CLE",
  "Dallas Mavericks": "DAL",
  "Denver Nuggets": "DEN",
  "Detroit Pistons": "DET",
  "Golden State Warriors": "GSW",
  "Houston Rockets": "HOU",
  "Indiana Pacers": "IND",
  "LA Clippers": "LAC",
  "Los Angeles Clippers": "LAC",
  "Los Angeles Lakers": "LAL",
  "LA Lakers": "LAL",
  "Memphis Grizzlies": "MEM",
  "Miami Heat": "MIA",
  "Milwaukee Bucks": "MIL",
  "Minnesota Timberwolves": "MIN",
  "New Orleans Pelicans": "NOP",
  "New York Knicks": "NYK",
  "Oklahoma City Thunder": "OKC",
  "Orlando Magic": "ORL",
  "Philadelphia 76ers": "PHI",
  "Phoenix Suns": "PHX",
  "Portland Trail Blazers": "POR",
  "Sacramento Kings": "SAC",
  "San Antonio Spurs": "SAS",
  "Toronto Raptors": "TOR",
  "Utah Jazz": "UTA",
  "Washington Wizards": "WAS",
};

// Positions NBA courantes dans les descriptions ESPN
const POSITIONS = ["G", "F", "C", "PG", "SG", "SF", "PF", "GF", "FC", "G-F", "F-C", "F-G", "C-F"];
const POS_PATTERN = POSITIONS.map((p) => p.replace("-", "\\-")).join("|");

interface ParsedTransaction {
  type: "acquired" | "signed" | "waived" | "claimed" | "traded";
  playerName: string;
  destinationTeamAbbr: string | null; // null pour waived
  sourceDescription: string;
}

/**
 * Extrait les noms individuels d'une description multi-joueurs
 * Ex: "CJ McCollum and F Corey Kispert" → ["CJ McCollum", "Corey Kispert"]
 */
function splitMultiPlayerName(rawName: string): string[] {
  const parts = rawName.split(
    new RegExp(`\\s+and\\s+(?:${POS_PATTERN})\\s+`, "i")
  );
  return parts.map((n) => n.trim()).filter((n) => n.length > 0);
}

/**
 * Parse une description de transaction ESPN
 * Gere les descriptions multi-phrases ("Signed X. Waived Y.")
 * et les trades multi-joueurs ("Acquired G X and F Y from...")
 *
 * Exemples :
 * - "Acquired G Trae Young from the Atlanta Hawks in exchange for..."
 * - "Acquired G CJ McCollum and F Corey Kispert from Washington Wizards..."
 * - "Signed F Player Name to a 10-day contract. Waived G Other Player."
 * - "Waived G Player Name."
 * - "Claimed G Player Name off waivers from the..."
 * - "Traded G Player Name to the Boston Celtics."
 */
function parseTransactionDescription(
  description: string,
  teamName: string
): ParsedTransaction[] {
  const teamAbbr = TEAM_NAME_TO_ABBR[teamName] ?? null;
  const results: ParsedTransaction[] = [];

  // Split multi-phrase : "Signed X to contract. Waived Y." → 2 phrases
  const sentences = description
    .split(/\.\s+(?=[A-Z])/)
    .map((s) => (s.endsWith(".") ? s : s + "."))
    .filter((s) => s.length > 5);

  for (const sentence of sentences) {
    // Ignorer fines/suspensions
    if (/\b(fined|suspended|reinstated)\b/i.test(sentence)) continue;

    // Acquired [Pos] [Name(s)] from [the?] [Team]
    const acquiredMatch = sentence.match(
      new RegExp(`^Acquired\\s+(?:${POS_PATTERN})\\s+(.+?)\\s+from\\s+(?:the\\s+)?`, "i")
    );
    if (acquiredMatch) {
      const playerNames = splitMultiPlayerName(acquiredMatch[1].trim());
      for (const name of playerNames) {
        results.push({
          type: "acquired",
          playerName: name,
          destinationTeamAbbr: teamAbbr,
          sourceDescription: description,
        });
      }
      continue;
    }

    // Signed [Pos] [Name] (to a contract / as a free agent / etc.)
    const signedMatch = sentence.match(
      new RegExp(`^Signed\\s+(?:${POS_PATTERN})\\s+(.+?)(?:\\s+to\\s+|\\s+as\\s+|\\s*\\.)`, "i")
    );
    if (signedMatch) {
      results.push({
        type: "signed",
        playerName: signedMatch[1].trim(),
        destinationTeamAbbr: teamAbbr,
        sourceDescription: description,
      });
      continue;
    }

    // Waived [Pos] [Name].
    const waivedMatch = sentence.match(
      new RegExp(`^Waived\\s+(?:${POS_PATTERN})\\s+(.+?)\\s*\\.`, "i")
    );
    if (waivedMatch) {
      results.push({
        type: "waived",
        playerName: waivedMatch[1].trim(),
        destinationTeamAbbr: null,
        sourceDescription: description,
      });
      continue;
    }

    // Claimed [Pos] [Name] off waivers (from the ...)
    const claimedMatch = sentence.match(
      new RegExp(`^Claimed\\s+(?:${POS_PATTERN})\\s+(.+?)\\s+off\\s+waivers`, "i")
    );
    if (claimedMatch) {
      results.push({
        type: "claimed",
        playerName: claimedMatch[1].trim(),
        destinationTeamAbbr: teamAbbr,
        sourceDescription: description,
      });
      continue;
    }

    // Traded [Pos] [Name] to [the?] [Team]
    const tradedMatch = sentence.match(
      new RegExp(`^Traded\\s+(?:${POS_PATTERN})\\s+(.+?)\\s+to\\s+(?:the\\s+)?(.+?)(?:\\s+in\\s+|\\s*\\.)`, "i")
    );
    if (tradedMatch) {
      const destTeamName = tradedMatch[2].trim();
      const destAbbr = TEAM_NAME_TO_ABBR[destTeamName] ?? null;
      results.push({
        type: "traded",
        playerName: tradedMatch[1].trim(),
        destinationTeamAbbr: destAbbr,
        sourceDescription: description,
      });
      continue;
    }
  }

  return results;
}

/**
 * Formate une date YYYY-MM-DD en YYYYMMDD pour l'API ESPN
 */
function formatDateForEspn(date: string): string {
  return date.replace(/-/g, "");
}

/**
 * Fetch les transactions ESPN pour une plage de dates
 */
async function fetchTransactions(from: string, to: string): Promise<any[]> {
  const dateRange = `${formatDateForEspn(from)}-${formatDateForEspn(to)}`;
  const allTransactions: any[] = [];
  let page = 1;
  const limit = 50;

  while (true) {
    const url = `${ESPN_TRANSACTIONS_API}?dates=${dateRange}&limit=${limit}&page=${page}`;
    console.log(`  Fetching page ${page}: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const transactions = data.transactions || data.items || [];

    if (transactions.length === 0) break;

    allTransactions.push(...transactions);

    // Si on a moins de resultats que le limit, c'est la derniere page
    if (transactions.length < limit) break;

    page++;
  }

  return allTransactions;
}

/**
 * Cherche un joueur en DB par nom exact, puis fuzzy
 */
async function findPlayerByName(fullName: string) {
  // 1. Recherche exacte par fullName
  let player = await prisma.player.findFirst({
    where: { fullName },
    include: { team: { select: { abbreviation: true } } },
  });
  if (player) return player;

  // 2. Recherche case-insensitive
  player = await prisma.player.findFirst({
    where: {
      fullName: { equals: fullName, mode: "insensitive" },
    },
    include: { team: { select: { abbreviation: true } } },
  });
  if (player) return player;

  // 3. Recherche par contient (fuzzy basique)
  // Utile pour les noms avec suffixes (Jr., III, etc.)
  const nameParts = fullName.split(" ");
  if (nameParts.length >= 2) {
    player = await prisma.player.findFirst({
      where: {
        AND: [
          { firstName: { equals: nameParts[0], mode: "insensitive" } },
          { lastName: { startsWith: nameParts[nameParts.length - 1], mode: "insensitive" } },
        ],
      },
      include: { team: { select: { abbreviation: true } } },
    });
  }

  return player;
}

const ESPN_SEARCH_API =
  "https://site.api.espn.com/apis/common/v3/search";
const ESPN_ATHLETE_API =
  "https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes";

/**
 * Recherche un joueur sur ESPN par nom et recupere ses infos
 */
async function fetchPlayerFromEspn(
  playerName: string
): Promise<{
  espnId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  position: string | null;
  jerseyNumber: string | null;
  headshot: string | null;
} | null> {
  try {
    // 1. Chercher le joueur par nom
    const searchUrl = `${ESPN_SEARCH_API}?query=${encodeURIComponent(playerName)}&limit=5&type=player&sport=basketball&league=nba`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    const items = searchData.items || [];
    if (items.length === 0) return null;

    // Prendre le premier resultat
    const espnId = items[0].id;
    if (!espnId) return null;

    // 2. Recuperer les details du joueur
    const athleteUrl = `${ESPN_ATHLETE_API}/${espnId}`;
    const athleteRes = await fetch(athleteUrl);
    if (!athleteRes.ok) {
      // Fallback : utiliser les infos de la recherche
      return {
        espnId: String(espnId),
        firstName: playerName.split(" ")[0] || playerName,
        lastName: playerName.split(" ").slice(1).join(" ") || playerName,
        fullName: items[0].displayName || playerName,
        position: null,
        jerseyNumber: null,
        headshot: null,
      };
    }

    const athleteData = await athleteRes.json();
    const a = athleteData.athlete || {};

    return {
      espnId: String(a.id || espnId),
      firstName: a.firstName || playerName.split(" ")[0],
      lastName: a.lastName || playerName.split(" ").slice(1).join(" "),
      fullName: a.displayName || playerName,
      position: a.position?.abbreviation || null,
      jerseyNumber: a.jersey || null,
      headshot: a.headshot?.href || null,
    };
  } catch (error) {
    console.error(`  ❌ Erreur recherche ESPN pour ${playerName}:`, error);
    return null;
  }
}

/**
 * Ajoute un parametre cache-busting au headshot pour forcer le re-telechargement
 * quand un joueur change d'equipe (ESPN met a jour l'image avec le nouveau maillot)
 */
function bustHeadshotCache(headshot: string | null): string | null {
  if (!headshot) return null;
  const url = headshot.split("?")[0];
  return `${url}?v=${Date.now()}`;
}

/**
 * Detecte le type de contrat depuis la description de la transaction
 */
function detectContractType(description: string): string | null {
  if (/two-way\s+contract/i.test(description)) return "two-way";
  if (/10-day\s+contract/i.test(description)) return "10-day";
  if (/\bsigned\b/i.test(description)) return "standard";
  return null;
}

export interface SyncTradesResult {
  totalTransactions: number;
  parsed: number;
  skipped: number;
  updated: number;
  created: number;
  warnings: string[];
}

/**
 * Logique principale de synchronisation des trades
 */
export async function syncTrades(
  from: string,
  to: string,
  dryRun: boolean
): Promise<SyncTradesResult> {
  console.log(`\n🔄 Synchronisation des trades NBA`);
  console.log(`📅 Periode: ${from} → ${to}`);
  if (dryRun) console.log(`🧪 Mode DRY RUN (aucune modification en DB)\n`);
  else console.log("");

  const result: SyncTradesResult = {
    totalTransactions: 0,
    parsed: 0,
    skipped: 0,
    updated: 0,
    created: 0,
    warnings: [],
  };

  // Fetch les transactions ESPN
  console.log("📡 Recuperation des transactions ESPN...");
  const transactions = await fetchTransactions(from, to);
  result.totalTransactions = transactions.length;
  console.log(`📊 ${transactions.length} transactions trouvees\n`);

  if (transactions.length === 0) {
    console.log("ℹ️  Aucune transaction pour cette periode");
    return result;
  }

  // Charger les equipes en DB pour le mapping abbreviation → id
  const teams = await prisma.team.findMany({
    select: { id: true, abbreviation: true },
  });
  const teamAbbrMap = new Map(teams.map((t) => [t.abbreviation, t.id]));

  // Set de deduplication : "playerName|destinationTeamAbbr|type"
  const processed = new Set<string>();

  for (const transaction of transactions) {
    const teamName = transaction.team?.displayName || transaction.team?.name || "";
    const descriptions: string[] = [];

    // L'API peut retourner les descriptions dans differents formats
    if (transaction.description) {
      descriptions.push(transaction.description);
    }
    if (transaction.text) {
      descriptions.push(transaction.text);
    }
    // Certaines transactions ont des items imbriques
    if (transaction.items) {
      for (const item of transaction.items) {
        if (item.description) descriptions.push(item.description);
        if (item.text) descriptions.push(item.text);
      }
    }

    for (const desc of descriptions) {
      // Ignorer les fines et suspensions
      if (/\b(fined|suspended|reinstated)\b/i.test(desc)) {
        continue;
      }

      const parsedList = parseTransactionDescription(desc, teamName);

      if (parsedList.length === 0) {
        // Description non parsable
        if (desc.length > 10) {
          const warning = `Description non parsee: "${desc.substring(0, 100)}..."`;
          result.warnings.push(warning);
        }
        result.skipped++;
        continue;
      }

      for (const parsed of parsedList) {
      result.parsed++;

      // Deduplication
      const dedupeKey = `${parsed.playerName}|${parsed.destinationTeamAbbr}|${parsed.type}`;
      if (processed.has(dedupeKey)) {
        console.log(`  ⏭️  Doublon ignore: ${parsed.playerName} (${parsed.type})`);
        continue;
      }
      processed.add(dedupeKey);

      // Determiner le nouveau teamId
      let newTeamId: string | null = null;
      if (parsed.destinationTeamAbbr) {
        newTeamId = teamAbbrMap.get(parsed.destinationTeamAbbr) ?? null;
        if (!newTeamId) {
          const warning = `Equipe non trouvee: ${parsed.destinationTeamAbbr} pour ${parsed.playerName}`;
          console.log(`  ⚠️  ${warning}`);
          result.warnings.push(warning);
          continue;
        }
      }

      // Trouver le joueur en DB
      let player = await findPlayerByName(parsed.playerName);

      if (!player) {
        // Joueur pas en DB : auto-creer si c'est une arrivee (signed, acquired, claimed)
        if (parsed.type === "waived" || parsed.type === "traded") {
          // Waived/traded mais pas en DB → on ne le connait pas, skip
          const warning = `Joueur non trouve en DB: ${parsed.playerName} (${parsed.type}) - skip`;
          console.log(`  ⚠️  ${warning}`);
          result.warnings.push(warning);
          continue;
        }

        // Chercher les infos du joueur sur ESPN
        console.log(`  🔍 Joueur inconnu: ${parsed.playerName} → recherche ESPN...`);
        const espnPlayer = await fetchPlayerFromEspn(parsed.playerName);

        if (!espnPlayer) {
          const warning = `Joueur introuvable sur ESPN: ${parsed.playerName}`;
          console.log(`  ❌ ${warning}`);
          result.warnings.push(warning);
          continue;
        }

        // Verifier si le joueur existe deja en DB par externalId (nom different)
        const existingByEspnId = await prisma.player.findUnique({
          where: { externalId: espnPlayer.espnId },
          include: { team: { select: { abbreviation: true } } },
        });

        if (existingByEspnId) {
          // Le joueur existe sous un autre nom, mettre a jour son equipe
          if (existingByEspnId.teamId === newTeamId) {
            console.log(
              `  ⏭️  ${existingByEspnId.fullName} (trouvé par ESPN ID) - Deja dans la bonne equipe (${parsed.destinationTeamAbbr ?? "free agent"})`
            );
          } else {
            const oldTeam = existingByEspnId.team?.abbreviation ?? "free agent";
            const newTeam = parsed.destinationTeamAbbr ?? "free agent";
            if (!dryRun) {
              await prisma.player.update({
                where: { id: existingByEspnId.id },
                data: {
                  teamId: newTeamId,
                  headshot: bustHeadshotCache(existingByEspnId.headshot),
                },
              });
            }
            console.log(
              `  ✅ ${existingByEspnId.fullName} (trouvé par ESPN ID): ${oldTeam} → ${newTeam} (${parsed.type})`
            );
            result.updated++;
          }
          continue;
        }

        const contractType = detectContractType(desc);

        if (dryRun) {
          console.log(
            `  🧪 [DRY RUN] Creerait ${espnPlayer.fullName} (ESPN ID: ${espnPlayer.espnId}, ${contractType ?? "standard"}) → ${parsed.destinationTeamAbbr}`
          );
        } else {
          player = await prisma.player.create({
            data: {
              externalId: espnPlayer.espnId,
              firstName: espnPlayer.firstName,
              lastName: espnPlayer.lastName,
              fullName: espnPlayer.fullName,
              position: espnPlayer.position,
              jerseyNumber: espnPlayer.jerseyNumber,
              headshot: espnPlayer.headshot,
              contractType,
              teamId: newTeamId,
            },
            include: { team: { select: { abbreviation: true } } },
          });
          console.log(
            `  🆕 ${player.fullName} cree en DB (ESPN ID: ${espnPlayer.espnId}, ${contractType ?? "standard"}) → ${parsed.destinationTeamAbbr}`
          );
        }

        result.created++;
        continue;
      }

      // Verifier si changement necessaire
      if (player.teamId === newTeamId) {
        console.log(
          `  ⏭️  ${player.fullName} - Deja dans la bonne equipe (${parsed.destinationTeamAbbr ?? "free agent"})`
        );
        continue;
      }

      const oldTeam = player.team?.abbreviation ?? "free agent";
      const newTeam = parsed.destinationTeamAbbr ?? "free agent";

      if (dryRun) {
        console.log(
          `  🧪 [DRY RUN] ${player.fullName}: ${oldTeam} → ${newTeam} (${parsed.type})`
        );
      } else {
        await prisma.player.update({
          where: { id: player.id },
          data: {
            teamId: newTeamId,
            headshot: bustHeadshotCache(player.headshot),
          },
        });
        console.log(
          `  ✅ ${player.fullName}: ${oldTeam} → ${newTeam} (${parsed.type})`
        );
      }

      result.updated++;
      } // fin for parsed of parsedList
    } // fin for desc of descriptions
  } // fin for transaction of transactions

  // Resume
  console.log("\n" + "=".repeat(50));
  console.log("✅ SYNCHRONISATION DES TRADES TERMINEE");
  console.log("=".repeat(50));
  console.log(`📊 Transactions totales : ${result.totalTransactions}`);
  console.log(`✅ Parsees : ${result.parsed}`);
  console.log(`⏭️  Ignorees : ${result.skipped}`);
  console.log(`🔄 Joueurs mis a jour : ${result.updated}`);
  console.log(`🆕 Joueurs crees : ${result.created}`);
  if (result.warnings.length > 0) {
    console.log(`⚠️  Warnings : ${result.warnings.length}`);
  }

  return result;
}

// --- CLI ---

const args = process.argv.slice(2);

const today = new Date().toISOString().split("T")[0];
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];

const options = {
  from: sevenDaysAgo,
  to: today,
  dryRun: args.includes("--dry-run"),
};

for (const arg of args) {
  if (arg.startsWith("--from=")) {
    options.from = arg.split("=")[1];
  }
  if (arg.startsWith("--to=")) {
    options.to = arg.split("=")[1];
  }
}

syncTrades(options.from, options.to, options.dryRun)
  .then(() => {
    console.log("\n✅ Script termine");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script echoue:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
