"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { BarChart3, ChevronRight, ClipboardList, Heart, Settings, Trophy, User } from "lucide-react";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentPredictionsList } from "@/components/dashboard/recent-predictions-list";
import { FriendButton } from "@/components/friends/friend-button";
import type { PublicProfile } from "@/lib/public-profile";
import { positionLabel } from "@/lib/position";
import { getTeamLogo } from "@/lib/nba-logos";
import { getSeasonLabel } from "@/types/season";

const ordinal = (n: number) => (n === 1 ? "1er" : `${n}e`);

/**
 * Fiche d'un joueur de l'app : la sienne (/profile) ou celle d'un autre (/joueur/[id]).
 * Boutons : ses pronos terminés (comparés aux miens), ajouter en ami, comparer les stats (amis).
 */
export function PlayerProfileView({ profile, isOwnProfile }: { profile: PublicProfile; isOwnProfile: boolean }) {
  const { user, friendship } = profile;
  const memberSince = formatDistanceToNow(new Date(user.createdAt), { addSuffix: true, locale: fr });
  const firstName = user.name.split(" ")[0];
  const pronosHref = isOwnProfile ? "/pronos/matchs" : `/joueur/${user.id}/pronos`;

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 md:space-y-8 md:py-8">
      {/* En-tête */}
      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-5 md:p-8">
        <div className="flex items-center gap-4 md:flex-row md:items-start md:gap-6">
          {/* Avatar + rang */}
          <div className="relative flex-shrink-0">
            {user.image ? (
              <img src={user.image} alt={user.name} className="h-20 w-20 rounded-full border-4 border-zinc-700 object-cover md:h-32 md:w-32" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-zinc-700 bg-gradient-to-br from-blue-500 to-purple-600 md:h-32 md:w-32">
                <User className="h-10 w-10 text-white md:h-16 md:w-16" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-zinc-900 bg-gradient-to-br from-yellow-500 to-yellow-600 px-2.5 py-1 text-xs font-bold text-white shadow-lg md:-bottom-2 md:-right-2 md:px-4 md:py-2 md:text-sm">
              {profile.rank ? `#${profile.rank}` : "–"}
            </div>
          </div>

          {/* Infos */}
          <div className="min-w-0 flex-1 md:text-left">
            <h1 className="truncate text-2xl font-black text-white md:mb-2 md:text-4xl md:font-bold">{user.name}</h1>
            <div className="mt-1 flex flex-col gap-1 text-zinc-400 md:mt-0 md:flex-row md:items-center md:gap-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 flex-shrink-0 text-yellow-500 md:h-5 md:w-5" />
                <span className="text-sm font-medium md:text-base">
                  {profile.rank ? (
                    <>
                      <span className="text-white">{ordinal(profile.rank)}</span> sur {profile.totalPlayers} ·{" "}
                      <span className="font-bold text-[#dcff50]">{profile.points} pts</span>
                    </>
                  ) : (
                    "Pas encore classé"
                  )}
                </span>
              </div>
              <div className="hidden text-zinc-700 md:block">•</div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 flex-shrink-0 text-blue-500 md:h-5 md:w-5" />
                <span className="text-xs md:text-sm">Membre {memberSince}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:gap-3">
          <Link
            href={pronosHref}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 text-sm font-bold text-white transition-colors hover:bg-zinc-700 active:scale-95"
          >
            <ClipboardList className="h-4 w-4 text-[#5096ff]" />
            {isOwnProfile ? "Mes pronos" : "Pronos"}
          </Link>
          {isOwnProfile ? (
            <Link
              href="/parametres"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
            >
              <Settings className="h-4 w-4" /> Paramètres
            </Link>
          ) : (
            <FriendButton targetUserId={user.id} targetName={firstName} initial={friendship} />
          )}
          {!isOwnProfile && friendship.status === "friends" && (
            <Link
              href={`/comparer/${user.id}`}
              className="col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
            >
              <BarChart3 className="h-4 w-4" /> Comparer nos stats
            </Link>
          )}
        </div>
      </div>

      {/* Favoris */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 md:p-6">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-white md:mb-4 md:text-xl">
          <Heart className="h-4 w-4 fill-red-500 text-red-500 md:h-5 md:w-5" />
          Favoris
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:gap-4">
          <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 md:gap-4 md:p-4">
            {user.favoriteTeam ? (
              <>
                <img src={user.favoriteTeam.logoUrl || getTeamLogo(user.favoriteTeam.abbreviation)} alt={user.favoriteTeam.name} className="h-11 w-11 object-contain md:h-16 md:w-16" />
                <div className="min-w-0">
                  <p className="text-xs text-zinc-500">Équipe favorite</p>
                  <p className="truncate text-sm font-semibold text-white">{user.favoriteTeam.city} {user.favoriteTeam.name}</p>
                </div>
              </>
            ) : (
              <>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 md:h-16 md:w-16">
                  <Trophy className="h-6 w-6 text-zinc-600 md:h-8 md:w-8" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Équipe favorite</p>
                  <p className="text-sm text-zinc-600">Aucune équipe sélectionnée</p>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 md:gap-4 md:p-4">
            {user.favoritePlayer ? (
              <>
                {user.favoritePlayer.team && (
                  <img src={user.favoritePlayer.team.logoUrl || getTeamLogo(user.favoritePlayer.team.abbreviation)} alt={user.favoritePlayer.team.abbreviation} className="h-11 w-11 object-contain md:h-16 md:w-16" />
                )}
                <div className="min-w-0">
                  <p className="text-xs text-zinc-500">Joueur favori</p>
                  <p className="truncate text-sm font-semibold text-white">{user.favoritePlayer.fullName}</p>
                  <p className="text-xs text-zinc-500">
                    {user.favoritePlayer.position && <>{positionLabel(user.favoritePlayer.position)} • </>}
                    {user.favoritePlayer.team?.abbreviation}
                    {user.favoritePlayer.jerseyNumber && <> • #{user.favoritePlayer.jerseyNumber}</>}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 md:h-16 md:w-16">
                  <User className="h-6 w-6 text-zinc-600 md:h-8 md:w-8" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Joueur favori</p>
                  <p className="text-sm text-zinc-600">Aucun joueur sélectionné</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats de la saison */}
      <div>
        <h2 className="mb-3 flex items-center gap-3 text-xl font-bold text-white md:mb-4 md:text-2xl">
          <span className="rounded-lg bg-gradient-to-br from-blue-900/30 to-zinc-800 p-2">
            <Trophy className="h-5 w-5 text-blue-400 md:h-6 md:w-6" />
          </span>
          Statistiques
          <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-300 md:text-sm">
            Saison {getSeasonLabel(profile.season)}
          </span>
        </h2>
        <StatsCards stats={profile.stats} />
      </div>

      {/* Derniers pronos terminés */}
      {profile.recentPredictions.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between gap-3 md:mb-4">
            <h2 className="flex items-center gap-3 text-xl font-bold text-white md:text-2xl">
              <span className="rounded-lg bg-gradient-to-br from-purple-900/30 to-zinc-800 p-2">
                <Trophy className="h-5 w-5 text-purple-400 md:h-6 md:w-6" />
              </span>
              Derniers pronos
            </h2>
            <Link href={pronosHref} className="flex flex-shrink-0 items-center gap-0.5 text-sm font-semibold text-[#5096ff] hover:underline">
              Tout voir <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <RecentPredictionsList predictions={profile.recentPredictions} />
        </div>
      )}
    </div>
  );
}
