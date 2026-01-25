"use client";

import { useEffect, useState } from "react";
import { Trophy, Lock, Star, TrendingUp, Award, Crown } from "lucide-react";

interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string | null;
  type: string;
  category: string;
  rarity: string;
  difficultyLevel: string | null;
  reward: string | null;
  isUnlocked: boolean;
  unlockedAt: Date | null;
  progress: number;
}

interface BadgeStats {
  total: number;
  unlocked: number;
  locked: number;
  percentage: number;
  byCategory: {
    [key: string]: {
      total: number;
      unlocked: number;
    };
  };
}

interface BadgeData {
  badges: Badge[];
  grouped: {
    SEASON: Badge[];
    END_SEASON: Badge[];
    CAREER: Badge[];
  };
  stats: BadgeStats;
  recentlyUnlocked: Badge[];
}

export default function BadgesPage() {
  const [data, setData] = useState<BadgeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<"SEASON" | "END_SEASON" | "CAREER">("SEASON");
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    try {
      const response = await fetch("/api/badges/user");

      // Si non authentifié, rediriger vers la page de connexion
      if (response.status === 401) {
        window.location.href = "/auth/login?redirect=/badges";
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch badges");
      }

      const data = await response.json();
      setData(data);
    } catch (error) {
      console.error("Error fetching badges:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-center h-64">
          <div className="text-zinc-400">Chargement des badges...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center text-zinc-400">
          Erreur lors du chargement des badges
        </div>
      </div>
    );
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "COMMON":
        return "bg-zinc-600 text-zinc-200";
      case "RARE":
        return "bg-blue-600 text-blue-100";
      case "EPIC":
        return "bg-purple-600 text-purple-100";
      case "LEGENDARY":
        return "bg-yellow-600 text-yellow-100";
      default:
        return "bg-zinc-600 text-zinc-200";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "SEASON":
        return <Trophy className="h-5 w-5" />;
      case "END_SEASON":
        return <Crown className="h-5 w-5" />;
      case "CAREER":
        return <Award className="h-5 w-5" />;
      default:
        return <Star className="h-5 w-5" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "SEASON":
        return "Accomplissement";
      case "END_SEASON":
        return "Fin de Saison";
      case "CAREER":
        return "Carrière";
      default:
        return category;
    }
  };

  // Ordre d'affichage des badges par famille (du plus facile au plus difficile)
  const badgeOrder: { [key: string]: number } = {
    // SEASON - Victoires de saison (1-8)
    "rookie": 1,
    "en-sortie-de-banc": 2,
    "6th-man-of-the-year": 3,
    "le-wilt": 4,
    "dans-le-5-majeur": 5,
    "all-star": 6,
    "mvp-de-la-saison": 7,
    "hall-of-fame": 8,

    // SEASON - Séries de victoires (9-12)
    "dans-la-zone": 9,
    "la-main-chaude": 10,
    "chef-curry": 11,
    "cheat-code": 12,

    // SEASON - Perfect daily (13-14)
    "le-sweep": 13,
    "wilson-chandler-dans-2k": 14,

    // SEASON - Daily winrate 50%+ (15-16)
    "pile-ou-face": 15,
    "on-est-la-pour-les-stats": 16,

    // SEASON - Daily winrate 75%+ (17-18)
    "clutch-player": 17,
    "precision-chirurgicale": 18,

    // SEASON - Équipe favorite victoires (19-22)
    "supporter-lambda": 19,
    "abonne-saison": 20,
    "le-chauvin": 21,
    "la-mascotte": 22,

    // SEASON - Équipe favorite séries (23-25)
    "fidelite-recompensee": 23,
    "le-vrai-supporter": 24,
    "legende-du-franchise": 25,

    // SEASON - Weekly/Monthly (26-28)
    "la-semaine-parfaite": 26,
    "le-mois-de-legende": 27,
    "la-semaine-cauchemar": 28,

    // SEASON - Séries de défaites (29-31)
    "debut-de-serie-noire": 29,
    "jai-glisse-chef": 30,
    "ca-fait-beaucoup-la-quand-meme": 31,

    // SEASON - Daily all lost (32-33)
    "du-bon-vieux-tanking": 32,
    "le-tanking-des-sixers": 33,

    // SEASON - Daily winrate low (34-35)
    "shaq-aux-lancers": 34,
    "ben-simmons-au-shoot": 35,

    // SEASON - Équipe favorite défaites (36-40)
    "premiere-desillusion": 36,
    "le-chat-noir": 37,
    "poisse-chronique": 38,
    "malediction-eternelle": 39,
    "on-a-un-traitre-parmi-nous": 40,

    // END_SEASON - Classement (41-47)
    "champion-supreme": 41,
    "vice-champion": 42,
    "sur-le-podium": 43,
    "elite-du-top-10": 44,
    "dans-le-cercle": 45,
    "milieu-de-tableau": 46,
    "premier-centaine": 47,

    // END_SEASON - Season winrate high (48-50)
    "regularite-solide": 48,
    "expert-confirme": 49,
    "maitre-de-la-precision": 50,

    // END_SEASON - Season winrate low (51-53)
    "participation-active": 51,
    "courage-et-perseverance": 52,
    "lincompris": 53,

    // END_SEASON - Favorite team winrate high (54-56)
    "fan-regulier": 54,
    "analyste-fan": 55,
    "voyance-fan-ultime": 56,

    // END_SEASON - Favorite team winrate low (57-59)
    "fan-decu": 57,
    "foi-ebranblee": 58,
    "trahison-totale": 59,

    // END_SEASON - Compétitions (60)
    "vainqueur-de-ligue": 60,

    // CAREER - Victoires totales (61-67)
    "centurion": 61,
    "stratege-confirme": 62,
    "maitre-pronostiqueur": 63,
    "legende-vivante": 64,
    "titan-du-prono": 65,
    "dieu-du-basket": 66,
    "limmortel": 67,

    // CAREER - Championships (68)
    "champion-historique": 68,

    // CAREER - Compétitions publiques (69-72)
    "vainqueur-public": 69,
    "dominateur-public": 70,
    "empereur-public": 71,
    "dynastie-publique": 72,

    // CAREER - Compétitions privées (73-76)
    "champion-prive": 73,
    "roi-des-cercles": 74,
    "baron-local": 75,
    "seigneur-des-ligues": 76,

    // CAREER - Saisons participées (77-79)
    "veteran-aguerri": 77,
    "pilier-de-la-communaute": 78,
    "ancetre-fondateur": 79,

    // CAREER - Élite récurrente (80)
    "gardien-de-lhistoire": 80,
  };

  const sortBadgesByFamily = (badges: Badge[]) => {
    return [...badges].sort((a, b) => {
      const orderA = badgeOrder[a.slug] || 999;
      const orderB = badgeOrder[b.slug] || 999;
      return orderA - orderB;
    });
  };

  // Filtrer et trier les badges selon la catégorie sélectionnée
  const filteredBadges = sortBadgesByFamily(
    data.badges.filter((badge) => {
      if (badge.category !== selectedCategory) {
        return false;
      }
      if (selectedType && badge.type !== selectedType) {
        return false;
      }
      return true;
    })
  );

  // Calculer les stats pour la catégorie sélectionnée
  const categoryBadges = data.grouped[selectedCategory];
  const categoryStats = {
    percentage: Math.round(
      (categoryBadges.filter((b) => b.isUnlocked).length / categoryBadges.length) * 100
    ),
    byRarity: {
      COMMON: {
        total: categoryBadges.filter((b) => b.rarity === "COMMON").length,
        unlocked: categoryBadges.filter((b) => b.rarity === "COMMON" && b.isUnlocked).length,
      },
      RARE: {
        total: categoryBadges.filter((b) => b.rarity === "RARE").length,
        unlocked: categoryBadges.filter((b) => b.rarity === "RARE" && b.isUnlocked).length,
      },
      EPIC: {
        total: categoryBadges.filter((b) => b.rarity === "EPIC").length,
        unlocked: categoryBadges.filter((b) => b.rarity === "EPIC" && b.isUnlocked).length,
      },
      LEGENDARY: {
        total: categoryBadges.filter((b) => b.rarity === "LEGENDARY").length,
        unlocked: categoryBadges.filter((b) => b.rarity === "LEGENDARY" && b.isUnlocked).length,
      },
    },
  };

  return (
    <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
            🏆 Badges & Accomplissements
          </h1>
          <p className="text-zinc-400 text-lg">
            Débloquez des badges en fonction de vos performances
          </p>
        </div>

        {/* Boutons de catégories - GROS et au-dessus des stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <button
            onClick={() => setSelectedCategory("SEASON")}
            className={`relative p-8 rounded-2xl border-2 transition-all ${
              selectedCategory === "SEASON"
                ? "bg-gradient-to-br from-blue-900/50 to-zinc-800 border-blue-500 shadow-lg shadow-blue-500/20"
                : "bg-zinc-900/50 border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50"
            }`}
          >
            <div className="text-center">
              <div className="text-5xl mb-3">🏀</div>
              <h3 className="text-xl font-bold text-white mb-1">Accomplissement</h3>
              <p className="text-sm text-zinc-400">Badges de saison</p>
              <div className="mt-3 text-2xl font-bold text-blue-400">
                {data.stats.byCategory.SEASON.unlocked}/{data.stats.byCategory.SEASON.total}
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelectedCategory("END_SEASON")}
            className={`relative p-8 rounded-2xl border-2 transition-all ${
              selectedCategory === "END_SEASON"
                ? "bg-gradient-to-br from-yellow-900/50 to-zinc-800 border-yellow-500 shadow-lg shadow-yellow-500/20"
                : "bg-zinc-900/50 border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50"
            }`}
          >
            <div className="text-center">
              <div className="text-5xl mb-3">👑</div>
              <h3 className="text-xl font-bold text-white mb-1">Fin de Saison</h3>
              <p className="text-sm text-zinc-400">Badges de classement</p>
              <div className="mt-3 text-2xl font-bold text-yellow-400">
                {data.stats.byCategory.END_SEASON.unlocked}/{data.stats.byCategory.END_SEASON.total}
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelectedCategory("CAREER")}
            className={`relative p-8 rounded-2xl border-2 transition-all ${
              selectedCategory === "CAREER"
                ? "bg-gradient-to-br from-purple-900/50 to-zinc-800 border-purple-500 shadow-lg shadow-purple-500/20"
                : "bg-zinc-900/50 border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50"
            }`}
          >
            <div className="text-center">
              <div className="text-5xl mb-3">💎</div>
              <h3 className="text-xl font-bold text-white mb-1">Carrière</h3>
              <p className="text-sm text-zinc-400">Badges permanents</p>
              <div className="mt-3 text-2xl font-bold text-purple-400">
                {data.stats.byCategory.CAREER.unlocked}/{data.stats.byCategory.CAREER.total}
              </div>
            </div>
          </button>
        </div>

        {/* Stats de la catégorie sélectionnée */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
          {/* Progression */}
          <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-purple-900/30 to-zinc-800 border border-purple-700/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-6 w-6 text-purple-500" />
              <span className="text-zinc-400 text-sm font-medium">Progression</span>
            </div>
            <p className="text-4xl font-bold text-purple-500">{categoryStats.percentage}%</p>
          </div>

          {/* COMMON */}
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-600 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Star className="h-5 w-5 text-zinc-400" />
              <span className="text-zinc-400 text-sm font-medium">COMMON</span>
            </div>
            <p className="text-3xl font-bold text-zinc-300">
              {categoryStats.byRarity.COMMON.unlocked}/{categoryStats.byRarity.COMMON.total}
            </p>
          </div>

          {/* RARE */}
          <div className="bg-gradient-to-br from-blue-900/30 to-zinc-800 border border-blue-700/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Star className="h-5 w-5 text-blue-400" />
              <span className="text-zinc-400 text-sm font-medium">RARE</span>
            </div>
            <p className="text-3xl font-bold text-blue-400">
              {categoryStats.byRarity.RARE.unlocked}/{categoryStats.byRarity.RARE.total}
            </p>
          </div>

          {/* EPIC */}
          <div className="bg-gradient-to-br from-purple-900/30 to-zinc-800 border border-purple-700/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Star className="h-5 w-5 text-purple-400" />
              <span className="text-zinc-400 text-sm font-medium">EPIC</span>
            </div>
            <p className="text-3xl font-bold text-purple-400">
              {categoryStats.byRarity.EPIC.unlocked}/{categoryStats.byRarity.EPIC.total}
            </p>
          </div>

          {/* LEGENDARY */}
          <div className="bg-gradient-to-br from-yellow-900/30 to-zinc-800 border border-yellow-700/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Crown className="h-5 w-5 text-yellow-400" />
              <span className="text-zinc-400 text-sm font-medium">LEGENDARY</span>
            </div>
            <p className="text-3xl font-bold text-yellow-400">
              {categoryStats.byRarity.LEGENDARY.unlocked}/{categoryStats.byRarity.LEGENDARY.total}
            </p>
          </div>
        </div>

        {/* Récemment débloqués */}
        {data.recentlyUnlocked.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <Star className="h-6 w-6 text-yellow-500" />
              Récemment Débloqués
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {data.recentlyUnlocked.map((badge) => (
                <div
                  key={badge.id}
                  className="bg-gradient-to-br from-yellow-900/30 to-zinc-800 border border-yellow-700/50 rounded-xl p-4 text-center"
                >
                  <div className="text-5xl mb-2">{badge.icon || "🏆"}</div>
                  <h3 className="font-bold text-white mb-1">{badge.name}</h3>
                  <p className="text-xs text-zinc-400 line-clamp-2">{badge.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Liste des badges */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBadges.map((badge) => (
            <div
              key={badge.id}
              className={`relative rounded-2xl p-6 border transition-all ${
                badge.isUnlocked
                  ? "bg-gradient-to-br from-zinc-800 to-zinc-900 border-zinc-600 shadow-lg"
                  : "bg-zinc-900/50 border-zinc-800 opacity-75"
              }`}
            >
              {/* Icône catégorie */}
              <div className="absolute top-4 right-4">
                {getCategoryIcon(badge.category)}
              </div>

              {/* Badge Icon */}
              <div className="text-6xl mb-4 text-center">
                {badge.isUnlocked ? badge.icon || "🏆" : "🔒"}
              </div>

              {/* Badge Info */}
              <h3 className="font-bold text-lg text-white mb-2 text-center">
                {badge.name}
              </h3>

              <p className="text-sm text-zinc-400 mb-4 text-center line-clamp-2">
                {badge.description}
              </p>

              {/* Rareté */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <span
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${getRarityColor(
                    badge.rarity
                  )}`}
                >
                  {badge.rarity}
                </span>
              </div>

              {/* Titre (Récompense) */}
              {badge.reward && (
                <div className="mb-3 text-center">
                  <span className="text-xs text-zinc-500">Titre :</span>
                  <p className="text-sm font-semibold text-yellow-500">
                    {badge.reward}
                  </p>
                </div>
              )}

              {/* Progress */}
              {!badge.isUnlocked && badge.progress > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-400">Progression</span>
                    <span className="text-xs text-zinc-400">
                      {Math.round(badge.progress)}%
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                      style={{ width: `${badge.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Unlocked date */}
              {badge.isUnlocked && badge.unlockedAt && (
                <div className="text-center">
                  <span className="text-xs text-green-500 font-medium">
                    ✅ Débloqué le{" "}
                    {new Date(badge.unlockedAt).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredBadges.length === 0 && (
          <div className="text-center py-12">
            <p className="text-zinc-400">Aucun badge trouvé avec ces filtres</p>
          </div>
        )}
      </div>
  );
}
