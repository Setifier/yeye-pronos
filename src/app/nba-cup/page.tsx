"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { getTeamLogo } from "@/lib/nba-logos";
import { NbaCupNavbar } from "@/components/layout/nba-cup-navbar";
import type { KnockoutGame, NbaCupApiResponse } from "@/app/api/nba-cup/route";

// ─── Shared constants ─────────────────────────────────────────────────────────

const CUP_COL_W = "w-[148px]";

// ─── CupGameCard — style SeriesCard des playoffs ──────────────────────────────

function CupGameCard({ game, compact = false }: { game: KnockoutGame | null; compact?: boolean }) {
  if (!game) return <TBDCard />;

  const isFinished = game.status === "FINAL";
  const isLive     = game.status === "LIVE";
  const homeWon    = isFinished && game.winnerId === game.homeTeam.id;
  const awayWon    = isFinished && game.winnerId === game.awayTeam.id;
  const logoSize   = compact ? 22 : 26;

  const renderRow = (
    team:  KnockoutGame["homeTeam"],
    score: number | null,
    won:   boolean,
    lost:  boolean
  ) => {
    const logo = getTeamLogo(team.abbreviation);
    return (
      <div className={`flex items-center gap-2 px-2.5 py-2 ${won ? "bg-amber-500/10" : lost ? "opacity-40" : ""}`}>
        <span className="w-3 flex-shrink-0" />
        {logo ? (
          <Image src={logo} alt={team.abbreviation} width={logoSize} height={logoSize} className="object-contain flex-shrink-0" />
        ) : (
          <div className="rounded bg-zinc-700 flex items-center justify-center flex-shrink-0" style={{ width: logoSize, height: logoSize }}>
            <span className="text-[8px] font-bold text-zinc-400">{team.abbreviation.slice(0, 3)}</span>
          </div>
        )}
        <span className={`text-xs font-semibold flex-1 min-w-0 truncate ${won ? "text-white" : lost ? "text-zinc-600" : "text-zinc-200"}`}>
          {team.abbreviation}
        </span>
        {(isFinished || isLive) && (
          <span className={`text-sm font-bold tabular-nums w-5 text-right flex-shrink-0 ${won ? "text-amber-400" : isLive ? "text-green-400" : "text-zinc-500"}`}>
            {score ?? "-"}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={`w-full rounded-xl border overflow-hidden ${
      isFinished ? "border-zinc-600/50 bg-zinc-800/40"
      : isLive    ? "border-green-500/30 bg-zinc-800/50"
      :             "border-zinc-700/50 bg-zinc-800/50"
    }`}>
      {renderRow(game.awayTeam, game.awayScore, awayWon, !awayWon && isFinished)}
      <div className="h-px bg-zinc-700/60" />
      {renderRow(game.homeTeam, game.homeScore, homeWon, !homeWon && isFinished)}
    </div>
  );
}

function TBDCard() {
  const row = (
    <div className="flex items-center gap-2 px-2.5 py-2">
      <span className="w-3 flex-shrink-0" />
      <div className="w-[22px] h-[22px] rounded bg-zinc-800/50 flex-shrink-0" />
      <span className="text-xs font-semibold text-zinc-700 flex-1">TBD</span>
    </div>
  );
  return (
    <div className="w-full rounded-xl border border-zinc-800/50 border-dashed overflow-hidden">
      {row}
      <div className="h-px bg-zinc-800/30" />
      {row}
    </div>
  );
}

// ─── RoundConnector — même géométrie SVG que les playoffs ────────────────────
// pairs=1 : 2 inputs (24.1% / 75.9%) → 1 output (50%)

function RoundConnector({ side }: { side: "left" | "right" }) {
  const pIn  = side === "right" ? "0%"   : "100%";
  const pOut = side === "right" ? "100%" : "0%";
  const lp   = { stroke: "#52525b", strokeWidth: "1.5" } as const;

  return (
    <div className="w-5 flex-shrink-0 self-stretch relative">
      <svg className="absolute inset-0 w-full h-full">
        <line x1={pIn}  y1="24.1%" x2="50%"  y2="24.1%" {...lp} />
        <line x1={pIn}  y1="75.9%" x2="50%"  y2="75.9%" {...lp} />
        <line x1="50%"  y1="24.1%" x2="50%"  y2="75.9%" {...lp} />
        <line x1="50%"  y1="50%"   x2={pOut} y2="50%"   {...lp} />
      </svg>
    </div>
  );
}

// ─── One conference side of the bracket ──────────────────────────────────────
// qfGames : 2 QF games for this conference
// sfGame  : 1 SF game for this conference
// isRight : East side → reversed layout

function BracketSide({
  qfGames,
  sfGame,
  isRight = false,
}: {
  qfGames: (KnockoutGame | null)[];
  sfGame:  KnockoutGame | null;
  isRight?: boolean;
}) {
  return (
    <div className={`flex-1 min-w-0 flex items-stretch ${isRight ? "flex-row-reverse" : "flex-row"}`}>
      {/* QF — 2 games, justify-around (centres à ~24% et ~76%) */}
      <div className={`${CUP_COL_W} flex flex-col justify-around flex-shrink-0`}>
        <CupGameCard game={qfGames[0] ?? null} compact />
        <CupGameCard game={qfGames[1] ?? null} compact />
      </div>

      <RoundConnector side={isRight ? "left" : "right"} />

      {/* SF — 1 game, justify-center (centre à 50%) */}
      <div className={`${CUP_COL_W} flex flex-col justify-center flex-shrink-0`}>
        <CupGameCard game={sfGame} compact />
      </div>

      {/* Stub → Finals: flex-1 assure que la ligne y=50% du stub
          correspond exactement à y=50% de la colonne entière. */}
      <div className="flex-1 self-stretch relative">
        <svg className="absolute inset-0 w-full h-full">
          <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="#52525b" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );
}

// ─── Bracket headers (col labels, même approche que playoffs) ────────────────

const SideHeaders = ({ isRight }: { isRight: boolean }) => (
  <div className={`flex-1 min-w-0 flex items-center ${isRight ? "flex-row-reverse" : "flex-row"}`}>
    <div className={`${CUP_COL_W} flex-shrink-0 text-center`}>
      <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider leading-none">Quarts de finale</span>
    </div>
    <div className="w-5 flex-shrink-0" />
    <div className={`${CUP_COL_W} flex-shrink-0 text-center`}>
      <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider leading-none">Demi-finales</span>
    </div>
    <div className="flex-1 min-w-0" /> {/* miroir du stub */}
  </div>
);

// ─── Desktop bracket ──────────────────────────────────────────────────────────

function DesktopBracket({ knockout }: { knockout: NbaCupApiResponse["knockout"] }) {
  const { quarterfinals: qf, semifinals: sf, championship: ch } = knockout;

  // Séparer par conférence (les QF/SF NBA Cup opposent des équipes de la même conf)
  const westQFs = qf.filter((g) => g.homeTeam.conference === "WEST");
  const eastQFs = qf.filter((g) => g.homeTeam.conference === "EAST");
  const westSF  = sf.find((g)  => g.homeTeam.conference === "WEST") ?? null;
  const eastSF  = sf.find((g)  => g.homeTeam.conference === "EAST") ?? null;
  const final   = ch[0] ?? null;

  // Champion
  const champion = final?.winnerId
    ? (final.winnerId === final.homeTeam.id ? final.homeTeam : final.awayTeam)
    : null;
  const champLogo = champion ? getTeamLogo(champion.abbreviation) : null;

  return (
    <div className="overflow-x-auto pb-4 pt-24">
      <div className="flex flex-col" style={{ minWidth: 700 }}>

        {/* ── Row 1 : conf labels ── */}
        <div className="flex items-center mb-2">
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-zinc-600 flex-shrink-0" />
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Ouest</span>
          </div>
          <div className="flex-shrink-0 w-[160px]" />
          <div className="flex-1 min-w-0 flex items-center justify-end gap-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Est</span>
            <div className="w-2 h-2 rounded-full bg-zinc-600 flex-shrink-0" />
          </div>
        </div>

        {/* ── Row 2 : col headers + "Finale NBA Cup" label ── */}
        <div className="flex items-center mb-2">
          <SideHeaders isRight={false} />
          <div className="flex-shrink-0 w-[160px] flex items-center justify-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500/80 flex-shrink-0" />
            <span className="text-[9px] font-bold text-amber-500/80 uppercase tracking-widest leading-none">Finale NBA Cup</span>
          </div>
          <SideHeaders isRight={true} />
        </div>

        {/* ── Row 3 : bracket grids + Finals card — items-stretch garantit la même hauteur ── */}
        <div className="flex items-stretch" style={{ minHeight: 280 }}>

          {/* Ouest */}
          <BracketSide qfGames={westQFs} sfGame={westSF} isRight={false} />

          {/* Finale — colonne centrale.
              Le game card est centré à y=50% avec justify-center.
              Le champion card est positionné en absolute bottom-full
              pour flotter au-dessus sans décaler la carte. */}
          <div className="flex-shrink-0 w-[160px] relative flex flex-col justify-center">
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {/* px-3 = 12px = 7.5% de 160px → lignes s'arrêtent au bord de la carte */}
              <line x1="0%"    y1="50%" x2="7.5%"  y2="50%" stroke="#52525b" strokeWidth="1.5" />
              <line x1="92.5%" y1="50%" x2="100%"  y2="50%" stroke="#52525b" strokeWidth="1.5" />
            </svg>

            <div className="px-3 relative z-10">
              <div className="relative">
                {/* Champion card — au-dessus du game card, positionné en absolute */}
                {champion && (
                  <div className="absolute bottom-full mb-2 left-0 right-0 bg-amber-500/10 border border-amber-500/25 rounded-xl px-2 py-2 text-center">
                    <p className="text-[8px] font-bold text-amber-400/70 uppercase tracking-widest mb-1.5">
                      Champion NBA Cup
                    </p>
                    {champLogo && (
                      <Image
                        src={champLogo}
                        alt={champion.abbreviation}
                        width={36}
                        height={36}
                        className="object-contain mx-auto mb-1"
                      />
                    )}
                    <p className="text-xs font-bold text-amber-400 leading-tight">
                      {champion.city} {champion.name}
                    </p>
                  </div>
                )}

                {/* Game card centré à y=50% */}
                <CupGameCard game={final} />
              </div>
            </div>
          </div>

          {/* Est */}
          <BracketSide qfGames={eastQFs} sfGame={eastSF} isRight={true} />

        </div>
      </div>
    </div>
  );
}

// ─── Mobile bracket ───────────────────────────────────────────────────────────

function MobileBracket({ knockout }: { knockout: NbaCupApiResponse["knockout"] }) {
  const { quarterfinals: qf, semifinals: sf, championship: ch } = knockout;
  const final    = ch[0] ?? null;
  const champion = final?.winnerId
    ? (final.winnerId === final.homeTeam.id ? final.homeTeam : final.awayTeam)
    : null;
  const champLogo = champion ? getTeamLogo(champion.abbreviation) : null;

  const rounds: Array<{ label: string; games: (KnockoutGame | null)[] }> = [
    { label: "Quarts de finale", games: qf.length > 0 ? qf : [null, null, null, null] },
    { label: "Demi-finales",     games: sf.length > 0 ? sf : [null, null]              },
    { label: "Finale NBA Cup",   games: [final]                                        },
  ];

  return (
    <div className="space-y-8">
      {rounds.map(({ label, games }, ri) => (
        <section key={label}>
          <div className="flex items-center gap-3 mb-3">
            {ri === 2 && <div className="w-1.5 h-1.5 rounded-full bg-amber-500/80 flex-shrink-0" />}
            <h2 className={`text-xs font-bold uppercase tracking-wider ${ri === 2 ? "text-amber-500/80" : "text-zinc-400"}`}>{label}</h2>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* Champion banner (mobile, above final card) */}
          {ri === 2 && champion && (
            <div className="mb-2 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2 flex items-center gap-3">
              {champLogo && <Image src={champLogo} alt={champion.abbreviation} width={32} height={32} className="object-contain flex-shrink-0" />}
              <div>
                <p className="text-[9px] font-bold text-amber-400/70 uppercase tracking-widest">Champion NBA Cup</p>
                <p className="text-sm font-bold text-amber-400">{champion.city} {champion.name}</p>
              </div>
            </div>
          )}

          <div className={`grid gap-3 ${ri < 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 max-w-xs"}`}>
            {games.map((g, i) => <CupGameCard key={g?.id ?? i} game={g} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NbaCupBracketPage() {
  const [data,    setData]    = useState<NbaCupApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/nba-cup")
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<NbaCupApiResponse>; })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <NbaCupNavbar />
      <div className="max-w-5xl mx-auto px-4 py-8">

        <div className="mb-8">
          <h1 className="text-xl font-bold text-white">NBA Cup — Bracket</h1>
          <p className="text-xs text-zinc-500 mt-0.5">{data ? `Saison ${data.season}` : "Chargement…"}</p>
        </div>

        {loading && <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-zinc-600 animate-spin" /></div>}
        {error   && <p className="text-sm text-zinc-500 py-10 text-center">Impossible de charger les données NBA Cup.</p>}

        {data && (
          <>
            <div className="hidden md:block">
              <DesktopBracket knockout={data.knockout} />
            </div>
            <div className="md:hidden">
              <MobileBracket knockout={data.knockout} />
            </div>
          </>
        )}

      </div>
    </div>
  );
}
