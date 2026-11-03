import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatsNavbar } from "@/components/layout/stats-navbar";
import { positionLabel } from "@/lib/position";
import { PlayerStats } from "@/components/matchs/player-stats";
import Image from "next/image";
import { BackButton } from "@/components/ui/back-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PlayerPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch player
  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      team: true,
    },
  });

  if (!player) {
    redirect("/joueurs");
  }

  return (
    <>
      <StatsNavbar />
      <main className="min-h-screen bg-zinc-950 text-zinc-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <BackButton />
          </div>

          {/* Player Header */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 mb-6">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              {player.headshot ? (
                <Image
                  src={player.headshot}
                  alt={player.fullName}
                  width={160}
                  height={160}
                  className="w-28 h-28 md:w-40 md:h-40 rounded-full object-cover flex-shrink-0 border-2 border-zinc-700"
                />
              ) : (
                <div className="w-28 h-28 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-4xl font-bold flex-shrink-0">
                  {player.firstName[0]}
                  {player.lastName[0]}
                </div>
              )}

              {/* Info */}
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2">{player.fullName}</h1>
                <div className="flex items-center gap-4 text-zinc-400">
                  {player.team && (
                    <span className="text-lg">{player.team.city} {player.team.name}</span>
                  )}
                  {player.position && (
                    <span className="px-3 py-1 bg-zinc-700/50 text-zinc-300 rounded-full text-sm font-medium">
                      {positionLabel(player.position)}
                    </span>
                  )}
                  {player.jerseyNumber && (
                    <span className="text-lg">#{player.jerseyNumber}</span>
                  )}
                </div>

                {/* Injury status */}
                {player.isInjured && (
                  <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-red-900/50 text-red-400 rounded-lg border border-red-800">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="font-semibold">{player.injuryStatus || "Blessé"}</span>
                    {player.injuryNote && <span className="text-sm">• {player.injuryNote}</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Height */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <p className="text-sm text-zinc-400 mb-1">Taille</p>
              <p className="text-2xl font-bold">
                {player.height || "-"}
                {player.heightMetric && (
                  <span className="text-sm text-zinc-500 ml-2">({player.heightMetric}m)</span>
                )}
              </p>
            </div>

            {/* Weight */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <p className="text-sm text-zinc-400 mb-1">Poids</p>
              <p className="text-2xl font-bold">
                {player.weight ? `${player.weight} lbs` : "-"}
                {player.weightMetric && (
                  <span className="text-sm text-zinc-500 ml-2">({player.weightMetric}kg)</span>
                )}
              </p>
            </div>

            {/* College */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <p className="text-sm text-zinc-400 mb-1">Formation</p>
              <p className="text-lg font-semibold">{player.college || "-"}</p>
            </div>

            {/* Country */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <p className="text-sm text-zinc-400 mb-1">Pays</p>
              <p className="text-lg font-semibold">{player.country || "-"}</p>
            </div>
          </div>

          {/* Player Stats */}
          <PlayerStats playerId={id} />
        </div>
      </main>
    </>
  );
}
