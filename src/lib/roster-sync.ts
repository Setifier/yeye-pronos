/**
 * Synchronisation des effectifs et de l'infirmerie (ESPN → Player / InjuryReport)
 *
 * Effectifs : les 30 rosters ESPN sont la source de vérité pour l'équipe d'un joueur.
 *   → couvre trades, signatures, waivers, rookies, two-way, sans parser les
 *     textes de transactions ESPN (trop fragiles : "Waived G X and G Y.", "Re-signed"…).
 *   - Joueur présent dans un roster → teamId, poste, numéro, photo, taille/poids, université, pays.
 *   - Joueur absent de TOUS les rosters → agent libre (teamId = null),
 *     UNIQUEMENT si les 30 rosters ont été récupérés correctement (sinon on ne touche à rien).
 *
 * Blessures : union de deux sources ESPN (vérifié le 23/10/2026 : 72 blessés dans chacune) :
 *   - /injuries : détails riches (type, côté, nature, date de retour) — l'id joueur
 *     n'est PAS dans `athlete.id`, il faut l'extraire de `athlete.links[].href`.
 *   - roster    : statut seul, sert de complément.
 *   Statuts stockés tels qu'ESPN les renvoie : "Out", "Day-To-Day", "Questionable"…
 */

import type { PrismaClient } from "@/generated/prisma";
import { ESPN_SITE_API, normalizeEspnAbbr } from "@/lib/espn";

type Logger = (msg: string) => void;

const MIN_ROSTER_SIZE = 12; // en dessous, on considère la réponse ESPN suspecte

// ============================================
// TYPES ESPN
// ============================================

interface EspnRosterAthlete {
  id:            string;
  firstName?:    string;
  lastName?:     string;
  displayName:   string;
  jersey?:       string;
  height?:       number; // pouces
  weight?:       number; // livres
  position?:     { abbreviation?: string };
  headshot?:     { href?: string };
  college?:      { name?: string };
  birthPlace?:   { country?: string };
  injuries?:     Array<{ status?: string; date?: string }>;
}

interface EspnInjuryEntry {
  status?:       string;
  date?:         string;
  shortComment?: string;
  longComment?:  string;
  athlete?: {
    id?:          string;
    displayName?: string;
    links?:       Array<{ href?: string }>;
  };
  details?: {
    type?:       string;
    location?:   string;
    detail?:     string;
    side?:       string;
    returnDate?: string;
  };
}

// ============================================
// FETCH
// ============================================

export async function fetchEspnTeams(): Promise<Array<{ espnId: string; abbr: string }>> {
  const res = await fetch(`${ESPN_SITE_API}/teams?limit=40`);
  if (!res.ok) throw new Error(`ESPN teams: HTTP ${res.status}`);
  const data = (await res.json()) as {
    sports?: Array<{ leagues?: Array<{ teams?: Array<{ team: { id: string; abbreviation: string } }> }> }>;
  };
  const teams = data.sports?.[0]?.leagues?.[0]?.teams ?? [];
  return teams.map(({ team }) => ({ espnId: team.id, abbr: normalizeEspnAbbr(team.abbreviation) }));
}

async function fetchEspnRoster(espnTeamId: string): Promise<{ abbr: string | null; athletes: EspnRosterAthlete[] }> {
  const res = await fetch(`${ESPN_SITE_API}/teams/${espnTeamId}/roster`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as {
    team?: { abbreviation?: string };
    athletes?: EspnRosterAthlete[];
    roster?: { entries?: Array<{ athlete: EspnRosterAthlete }> };
  };
  const athletes = Array.isArray(data.athletes) && data.athletes.length > 0
    ? data.athletes
    : (data.roster?.entries ?? []).map((e) => e.athlete);
  return { abbr: data.team?.abbreviation ? normalizeEspnAbbr(data.team.abbreviation) : null, athletes };
}

async function fetchEspnInjuries(): Promise<EspnInjuryEntry[]> {
  const res = await fetch(`${ESPN_SITE_API}/injuries`);
  if (!res.ok) throw new Error(`ESPN injuries: HTTP ${res.status}`);
  const data = (await res.json()) as { injuries?: Array<{ injuries?: EspnInjuryEntry[] }> };
  return (data.injuries ?? []).flatMap((t) => t.injuries ?? []);
}

/** Exécute des promesses par paquets pour ménager l'API ESPN. */
async function inBatches<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return out;
}

// ============================================
// HELPERS JOUEURS
// ============================================

function normalizePosition(raw: string | undefined): string | null {
  if (!raw) return null;
  const p = raw.toUpperCase().trim();
  if (p === "PG" || p === "SG") return "G";
  if (p === "SF" || p === "PF") return "F";
  return p;
}

function physical(a: EspnRosterAthlete) {
  const inches = a.height ?? null;
  const lbs    = a.weight ?? null;
  return {
    height:       inches ? `${Math.floor(inches / 12)}-${inches % 12}` : null,
    heightMetric: inches ? (inches * 0.0254).toFixed(2) : null,
    weight:       lbs ? String(lbs) : null,
    weightMetric: lbs ? String(Math.round(lbs * 0.453592)) : null,
  };
}

// ============================================
// EFFECTIFS
// ============================================

export interface RosterSyncResult {
  teamsOk:      number;
  teamsFailed:  string[];
  perTeam:      Record<string, number>;
  created:      string[];
  moved:        string[];
  updated:      number;
  freeAgents:   string[];
  freeAgentCleanup: "done" | "skipped" | "disabled";
  /** espnId → statut de blessure vu dans les rosters (complément de /injuries) */
  rosterInjuries: Map<string, { status: string; date?: string }>;
  rosterComplete: boolean;
}

export async function syncRosters(
  prisma: PrismaClient,
  opts: { markFreeAgents?: boolean; log?: Logger } = {}
): Promise<RosterSyncResult> {
  const log = opts.log ?? (() => {});
  const markFreeAgents = opts.markFreeAgents ?? true;

  const result: RosterSyncResult = {
    teamsOk: 0, teamsFailed: [], perTeam: {}, created: [], moved: [], updated: 0,
    freeAgents: [], freeAgentCleanup: markFreeAgents ? "skipped" : "disabled",
    rosterInjuries: new Map(), rosterComplete: false,
  };

  const espnTeams = await fetchEspnTeams();
  const dbTeams   = await prisma.team.findMany({ select: { id: true, abbreviation: true } });
  const teamByAbbr = new Map(dbTeams.map((t) => [t.abbreviation, t]));
  const abbrById   = new Map(dbTeams.map((t) => [t.id, t.abbreviation]));

  // 1. Rosters ESPN (6 requêtes en parallèle)
  const rosters = await inBatches(espnTeams, 6, async (t) => {
    try {
      const r = await fetchEspnRoster(t.espnId);
      return { team: t, ...r, error: null as string | null };
    } catch (err) {
      return { team: t, abbr: null, athletes: [] as EspnRosterAthlete[], error: err instanceof Error ? err.message : String(err) };
    }
  });

  // 2. Joueurs existants (une seule requête)
  const allEspnIds = rosters.flatMap((r) => r.athletes.map((a) => a.id));
  const existing = await prisma.player.findMany({
    where:  { externalId: { in: allEspnIds } },
    select: {
      id: true, externalId: true, teamId: true, fullName: true, position: true,
      jerseyNumber: true, headshot: true, height: true, weight: true, college: true, country: true,
    },
  });
  const existingByEspnId = new Map(existing.map((p) => [p.externalId, p]));
  const seen = new Set<string>();

  for (const r of rosters) {
    const dbTeam = teamByAbbr.get(r.team.abbr);
    if (!dbTeam) {
      result.teamsFailed.push(`${r.team.abbr} (absente de la DB)`);
      continue;
    }
    if (r.error || r.athletes.length < MIN_ROSTER_SIZE || (r.abbr && r.abbr !== r.team.abbr)) {
      result.teamsFailed.push(`${r.team.abbr} (${r.error ?? `${r.athletes.length} joueurs, abbr ${r.abbr}`})`);
      // On marque quand même ces joueurs comme "vus" pour ne pas les passer agents libres
      for (const a of r.athletes) seen.add(a.id);
      continue;
    }

    result.teamsOk++;
    result.perTeam[dbTeam.abbreviation] = r.athletes.length;

    for (const a of r.athletes) {
      seen.add(a.id);
      if (a.injuries?.[0]?.status) {
        result.rosterInjuries.set(a.id, { status: a.injuries[0].status, date: a.injuries[0].date });
      }

      const firstName = (a.firstName || a.displayName.split(" ")[0] || "Unknown").trim();
      const lastName  = (a.lastName || a.displayName.split(" ").slice(1).join(" ") || "Unknown").trim();
      const data = {
        firstName,
        lastName,
        fullName:     `${firstName} ${lastName}`,
        position:     normalizePosition(a.position?.abbreviation),
        jerseyNumber: a.jersey ?? null,
        teamId:       dbTeam.id,
        headshot:     a.headshot?.href ?? `https://a.espncdn.com/i/headshots/nba/players/full/${a.id}.png`,
        college:      a.college?.name ?? null,
        country:      a.birthPlace?.country ?? null,
        ...physical(a),
      };

      const prev = existingByEspnId.get(a.id);
      if (!prev) {
        await prisma.player.create({ data: { externalId: a.id, ...data } });
        result.created.push(`${data.fullName} (${dbTeam.abbreviation})`);
        continue;
      }

      const changed =
        prev.teamId !== data.teamId ||
        prev.fullName !== data.fullName ||
        prev.position !== data.position ||
        prev.jerseyNumber !== data.jerseyNumber ||
        prev.headshot !== data.headshot ||
        prev.height !== data.height ||
        prev.weight !== data.weight ||
        prev.college !== data.college ||
        prev.country !== data.country;
      if (!changed) continue;

      await prisma.player.update({ where: { id: prev.id }, data });
      result.updated++;
      if (prev.teamId !== data.teamId) {
        const from = prev.teamId ? abbrById.get(prev.teamId) ?? "?" : "agent libre";
        result.moved.push(`${data.fullName} : ${from} → ${dbTeam.abbreviation}`);
      }
    }
  }

  result.rosterComplete = result.teamsOk === 30 && result.teamsFailed.length === 0;

  // 3. Agents libres — seulement si les 30 rosters sont fiables
  if (markFreeAgents && result.rosterComplete) {
    const gone = await prisma.player.findMany({
      where:  { teamId: { not: null }, externalId: { notIn: [...seen] } },
      select: { id: true, fullName: true, teamId: true },
    });
    for (const p of gone) {
      await prisma.player.update({ where: { id: p.id }, data: { teamId: null } });
      result.freeAgents.push(`${p.fullName} (${p.teamId ? abbrById.get(p.teamId) : "?"})`);
    }
    result.freeAgentCleanup = "done";
  } else if (markFreeAgents) {
    log(`⚠️  Rosters incomplets (${result.teamsOk}/30) — détection des agents libres ignorée`);
  }

  log(
    `👥 Effectifs : ${result.teamsOk}/30 équipes · ${result.created.length} nouveau(x) · ` +
    `${result.moved.length} transfert(s) · ${result.freeAgents.length} agent(s) libre(s)`
  );
  for (const m of result.moved) log(`   🔁 ${m}`);
  for (const c of result.created) log(`   🆕 ${c}`);
  for (const f of result.freeAgents) log(`   🆓 ${f}`);
  for (const f of result.teamsFailed) log(`   ⚠️  ${f}`);

  return result;
}

// ============================================
// BLESSURES
// ============================================

const BODY_PARTS: Record<string, { fr: string; f?: boolean }> = {
  knee: { fr: "Genou" }, ankle: { fr: "Cheville", f: true }, foot: { fr: "Pied" },
  hamstring: { fr: "Ischio-jambiers" }, calf: { fr: "Mollet" }, back: { fr: "Dos" },
  "lower back": { fr: "Bas du dos" }, hip: { fr: "Hanche", f: true }, groin: { fr: "Adducteurs" },
  shoulder: { fr: "Épaule", f: true }, wrist: { fr: "Poignet" }, hand: { fr: "Main", f: true },
  finger: { fr: "Doigt" }, thumb: { fr: "Pouce" }, elbow: { fr: "Coude" },
  achilles: { fr: "Tendon d'Achille" }, quadriceps: { fr: "Quadriceps" }, quad: { fr: "Quadriceps" },
  thigh: { fr: "Cuisse", f: true }, toe: { fr: "Orteil" }, heel: { fr: "Talon" },
  shin: { fr: "Tibia" }, leg: { fr: "Jambe", f: true }, "lower leg": { fr: "Jambe", f: true },
  abdomen: { fr: "Abdominaux" }, oblique: { fr: "Oblique" }, chest: { fr: "Poitrine", f: true },
  rib: { fr: "Côtes", f: true }, ribs: { fr: "Côtes", f: true }, neck: { fr: "Cou" },
  head: { fr: "Tête", f: true }, face: { fr: "Visage" }, eye: { fr: "Œil" }, nose: { fr: "Nez" },
  pelvis: { fr: "Bassin" }, glute: { fr: "Fessier" }, arm: { fr: "Bras" }, forearm: { fr: "Avant-bras" },
  "plantar fascia": { fr: "Fascia plantaire" },
  concussion: { fr: "Commotion cérébrale", f: true }, illness: { fr: "Maladie", f: true },
  personal: { fr: "Raisons personnelles" }, rest: { fr: "Repos" },
  "not injury related": { fr: "Hors blessure" }, suspension: { fr: "Suspension", f: true },
  conditioning: { fr: "Remise en forme", f: true },
};

const INJURY_DETAILS: Record<string, string> = {
  sprain: "entorse", strain: "élongation", fracture: "fracture", soreness: "douleur",
  tear: "déchirure", torn: "déchirure", surgery: "opération", contusion: "contusion",
  bruise: "contusion", tendinitis: "tendinite", tendinopathy: "tendinopathie",
  inflammation: "inflammation", dislocation: "luxation", spasms: "spasmes",
  tightness: "raideur", rupture: "rupture", "bone bruise": "œdème osseux",
  "stress reaction": "réaction de stress", impingement: "conflit", bursitis: "bursite",
  hyperextension: "hyperextension", laceration: "coupure", irritation: "irritation",
  fatigue: "fatigue", management: "gestion", recovery: "récupération",
};

/** Ex : { type: "Foot", side: "Left", detail: "Fracture" } → "Pied gauche (fracture)" */
export function formatInjuryNote(details?: EspnInjuryEntry["details"]): string | null {
  if (!details?.type) return null;
  const key  = details.type.toLowerCase().trim();
  const part = BODY_PARTS[key];
  const base = part?.fr ?? details.type;
  const side = details.side?.toLowerCase();
  const sideFr =
    side === "left"  ? "gauche" :
    side === "right" ? (part?.f ? "droite" : "droit") : "";
  const detail = details.detail ? INJURY_DETAILS[details.detail.toLowerCase().trim()] ?? details.detail.toLowerCase() : "";
  return `${base}${sideFr ? ` ${sideFr}` : ""}${detail ? ` (${detail})` : ""}`;
}

function espnIdFromInjury(entry: EspnInjuryEntry): string | null {
  if (entry.athlete?.id) return String(entry.athlete.id);
  for (const l of entry.athlete?.links ?? []) {
    const m = l.href?.match(/\/id\/(\d+)/);
    if (m) return m[1];
  }
  return null;
}

function parseDate(s?: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export interface InjurySyncResult {
  injured:    number;
  updated:    number;
  recovered:  string[];
  notFound:   string[];
  recoverySkipped: boolean;
}

export async function syncInjuries(
  prisma: PrismaClient,
  opts: { rosterInjuries?: Map<string, { status: string; date?: string }>; rosterComplete?: boolean; log?: Logger } = {}
): Promise<InjurySyncResult> {
  const log = opts.log ?? (() => {});
  const result: InjurySyncResult = { injured: 0, updated: 0, recovered: [], notFound: [], recoverySkipped: false };

  let entries: EspnInjuryEntry[] = [];
  let endpointOk = false;
  try {
    entries = await fetchEspnInjuries();
    endpointOk = true;
  } catch (err) {
    log(`⚠️  Endpoint blessures ESPN indisponible : ${err instanceof Error ? err.message : String(err)}`);
  }

  // Union des deux sources
  type Inj = { status: string; note: string | null; returnDate: Date | null; injuryDate: Date | null; description: string | null; type: string };
  const injuries = new Map<string, Inj & { name: string }>();
  for (const e of entries) {
    const id = espnIdFromInjury(e);
    if (!id || !e.status) continue;
    injuries.set(id, {
      name:        e.athlete?.displayName ?? id,
      status:      e.status,
      note:        formatInjuryNote(e.details),
      returnDate:  parseDate(e.details?.returnDate),
      injuryDate:  parseDate(e.date),
      description: e.shortComment ?? e.longComment ?? null,
      type:        e.details?.type ?? "Blessure",
    });
  }
  for (const [id, r] of opts.rosterInjuries ?? []) {
    if (injuries.has(id)) continue;
    injuries.set(id, { name: id, status: r.status, note: null, returnDate: null, injuryDate: parseDate(r.date), description: null, type: "Blessure" });
  }

  const players = await prisma.player.findMany({
    where:  { externalId: { in: [...injuries.keys()] } },
    select: { id: true, externalId: true, fullName: true, isInjured: true, injuryStatus: true, injuryNote: true, injuryReturnDate: true },
  });
  const playerByEspnId = new Map(players.map((p) => [p.externalId, p]));
  const activeReports = await prisma.injuryReport.findMany({
    where:  { isActive: true, playerId: { in: players.map((p) => p.id) } },
    select: { id: true, playerId: true },
  });
  const reportByPlayer = new Map(activeReports.map((r) => [r.playerId, r.id]));

  for (const [espnId, inj] of injuries) {
    const p = playerByEspnId.get(espnId);
    if (!p) {
      result.notFound.push(inj.name);
      continue;
    }
    result.injured++;

    const changed =
      !p.isInjured ||
      p.injuryStatus !== inj.status ||
      p.injuryNote !== inj.note ||
      (p.injuryReturnDate?.getTime() ?? null) !== (inj.returnDate?.getTime() ?? null);
    if (!changed) continue;

    await prisma.player.update({
      where: { id: p.id },
      data:  { isInjured: true, injuryStatus: inj.status, injuryNote: inj.note, injuryReturnDate: inj.returnDate },
    });

    const reportId = reportByPlayer.get(p.id);
    if (reportId) {
      await prisma.injuryReport.update({
        where: { id: reportId },
        data:  { status: inj.status, description: inj.description, returnDate: inj.returnDate, injuryType: inj.type },
      });
    } else {
      await prisma.injuryReport.create({
        data: {
          playerId:    p.id,
          injuryType:  inj.type,
          status:      inj.status,
          description: inj.description,
          injuryDate:  inj.injuryDate ?? new Date(),
          returnDate:  inj.returnDate,
          isActive:    true,
        },
      });
    }
    result.updated++;
  }

  // Rétablissements : seulement si les sources sont fiables (évite de "guérir" tout le monde sur une panne ESPN)
  const reliable = endpointOk && (entries.length >= 10 || opts.rosterComplete === true);
  if (reliable) {
    const healed = await prisma.player.findMany({
      where:  { isInjured: true, externalId: { notIn: [...injuries.keys()] } },
      select: { id: true, fullName: true },
    });
    for (const p of healed) {
      await prisma.player.update({
        where: { id: p.id },
        data:  { isInjured: false, injuryStatus: null, injuryNote: null, injuryReturnDate: null },
      });
      await prisma.injuryReport.updateMany({
        where: { playerId: p.id, isActive: true },
        data:  { isActive: false, returnDate: new Date() },
      });
      result.recovered.push(p.fullName);
    }
    // Nettoyage des anciens statuts "ACTIVE"/"HEALTHY" laissés par l'ancien CRON
    await prisma.player.updateMany({
      where: { isInjured: false, injuryStatus: { not: null } },
      data:  { injuryStatus: null, injuryNote: null, injuryReturnDate: null },
    });
  } else {
    result.recoverySkipped = true;
    log("⚠️  Sources blessures incomplètes — rétablissements ignorés pour ce passage");
  }

  log(
    `🩹 Blessures : ${result.injured} joueur(s) à l'infirmerie · ${result.updated} mise(s) à jour · ` +
    `${result.recovered.length} rétabli(s)${result.notFound.length ? ` · ${result.notFound.length} inconnu(s) en DB` : ""}`
  );
  for (const r of result.recovered) log(`   ✅ ${r}`);

  return result;
}

/** Effectifs puis blessures (la passe effectifs fournit le complément roster). */
export async function syncRostersAndInjuries(
  prisma: PrismaClient,
  opts: { markFreeAgents?: boolean; log?: Logger } = {}
) {
  const rosters  = await syncRosters(prisma, opts);
  const injuries = await syncInjuries(prisma, {
    rosterInjuries: rosters.rosterInjuries,
    rosterComplete: rosters.rosterComplete,
    log: opts.log,
  });
  return { rosters, injuries };
}
