import { requireAdmin } from "@/lib/auth-helpers";
import { headers } from "next/headers";
import { getAppBaseUrl } from "@/lib/app-url";
import { StatCard } from "@/components/admin/stat-card";
import {
  UsersIcon,
  Target,
  TrophyIcon,
  TrendingUpIcon,
} from "lucide-react";

interface AdminStats {
  users: {
    total: number;
    activeToday: number;
    byRole: {
      USER: number;
      ADMIN: number;
    };
  };
  predictions: {
    total: number;
    byStatus: {
      PENDING: number;
      WON: number;
      LOST: number;
    };
  };
  games: {
    total: number;
  };
}

async function getAdminStats(): Promise<AdminStats | null> {
  try {
    const baseUrl = getAppBaseUrl();
    const headersList = await headers();

    const response = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: {
        cookie: headersList.get("cookie") || "",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Failed to fetch admin stats:", response.statusText);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return null;
  }
}

export default async function AdminDashboardPage() {
  // Récupérer la session et vérifier les droits admin (gère les cookies orphelins)
  await requireAdmin();

  // Récupérer les stats
  const stats = await getAdminStats();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          Tableau de bord Admin
        </h1>
        <p className="text-zinc-400 mt-2">
          Vue d&apos;ensemble de l&apos;application NBA Pronos
        </p>
      </div>

      {stats ? (
        <>
          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Utilisateurs"
              value={stats.users.total}
              icon={UsersIcon}
              color="blue"
              subtitle={`${stats.users.activeToday} actifs aujourd'hui`}
            />

            <StatCard
              title="Pronos total"
              value={stats.predictions.total}
              icon={Target}
              color="green"
              subtitle={`${stats.predictions.byStatus.PENDING} en attente`}
            />

            <StatCard
              title="Matchs NBA"
              value={stats.games.total}
              icon={TrophyIcon}
              color="yellow"
              subtitle="Matchs dans la base"
            />

            <StatCard
              title="Taux d&apos;activité"
              value={
                stats.users.total > 0
                  ? `${((stats.users.activeToday / stats.users.total) * 100).toFixed(1)}%`
                  : "0%"
              }
              icon={TrendingUpIcon}
              color="purple"
              subtitle="Utilisateurs actifs"
            />
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pronos Stats */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                Statistiques Pronos
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Gagnés</span>
                  <span className="text-green-400 font-semibold">
                    {stats.predictions.byStatus.WON}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Perdus</span>
                  <span className="text-red-400 font-semibold">
                    {stats.predictions.byStatus.LOST}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">En attente</span>
                  <span className="text-yellow-400 font-semibold">
                    {stats.predictions.byStatus.PENDING}
                  </span>
                </div>
              </div>
            </div>

            {/* Users Stats */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                Répartition Utilisateurs
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Utilisateurs</span>
                  <span className="text-blue-400 font-semibold">
                    {stats.users.byRole.USER}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Administrateurs</span>
                  <span className="text-purple-400 font-semibold">
                    {stats.users.byRole.ADMIN}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
          <p className="text-zinc-400">
            Impossible de charger les statistiques
          </p>
        </div>
      )}
    </div>
  );
}
