"use client";

import { useState, useEffect } from "react";
import { redirect, useRouter } from "next/navigation";
import Image from "next/image";
import {
  Bell,
  Mail,
  Shield,
  Loader2,
  Save,
  AlertCircle,
  Users,
  Trophy,
  Calendar,
  CheckSquare,
  Square,
  User,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import { AvatarUploadModal } from "@/components/avatar-upload-modal";

interface NotificationSettings {
  // Email digest quotidien
  dailyEmailEnabled: boolean;
  emailIncludeMissing: boolean;
  emailIncludeResults: boolean;
  emailIncludeRanking: boolean;
  emailFrequency: string;

  // Notifications web - Social
  notifFriendRequest: boolean;
  notifLeagueInvitation: boolean;
  notifLeagueStarted: boolean;

  // Notifications web - Spoilers
  notifGameFinished: boolean;
  notifPronoWon: boolean;
  notifPronoLost: boolean;
  notifRankingUp: boolean;
  notifRankingDown: boolean;
  notifBadgeUnlocked: boolean;
  notifStreakWarning: boolean;
  notifSomeonePassedYou: boolean;

  // Notifications web - Rappels
  notifReminderNoProno: boolean;

  // Push notifications (PWA)
  pushEnabled: boolean;
}

export default function ParametresPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Préférences du profil
  const [nickname, setNickname] = useState("");
  const [userImage, setUserImage] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Favoris
  const [favoriteTeamId, setFavoriteTeamId] = useState<string | null>(null);
  const [favoritePlayerId, setFavoritePlayerId] = useState<string | null>(null);
  const [favoriteTeam, setFavoriteTeam] = useState<any>(null);
  const [favoritePlayer, setFavoritePlayer] = useState<any>(null);
  const [savingFavorites, setSavingFavorites] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [notifRes, userRes] = await Promise.all([
        fetch("/api/notifications/settings"),
        fetch("/api/user/profile"),
      ]);

      if (notifRes.status === 401 || userRes.status === 401) {
        redirect("/auth/login");
        return;
      }

      if (!notifRes.ok || !userRes.ok) {
        throw new Error("Erreur lors du chargement des paramètres");
      }

      const notifData = await notifRes.json();
      const userData = await userRes.json();

      setSettings(notifData.settings);
      setNickname(userData.name);
      setUserName(userData.name);
      setUserImage(userData.image);
      setFavoriteTeamId(userData.favoriteTeamId);
      setFavoritePlayerId(userData.favoritePlayerId);
      setFavoriteTeam(userData.favoriteTeam);
      setFavoritePlayer(userData.favoritePlayer);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Erreur lors du chargement des paramètres");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNickname = async () => {
    if (!nickname.trim()) {
      toast.error("Le surnom ne peut pas être vide");
      return;
    }

    setSavingProfile(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nickname.trim() }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour");
      }

      setUserName(nickname.trim());
      toast.success("Surnom mis à jour !");
      router.refresh();
    } catch (error) {
      console.error("Error updating nickname:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveFavorites = async () => {
    setSavingFavorites(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          favoriteTeamId: favoriteTeamId || null,
          favoritePlayerId: favoritePlayerId || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour");
      }

      toast.success("Favoris mis à jour !");
      router.refresh();
    } catch (error) {
      console.error("Error updating favorites:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setSavingFavorites(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const response = await fetch("/api/notifications/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la sauvegarde");
      }

      toast.success("Paramètres sauvegardés !");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof NotificationSettings, value: boolean | string) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const toggleAllSpoilers = (enabled: boolean) => {
    if (!settings) return;
    setSettings({
      ...settings,
      notifGameFinished: enabled,
      notifPronoWon: enabled,
      notifPronoLost: enabled,
      notifRankingUp: enabled,
      notifRankingDown: enabled,
      notifBadgeUnlocked: enabled,
      notifStreakWarning: enabled,
      notifSomeonePassedYou: enabled,
    });
  };

  const areAllSpoilersEnabled = settings
    ? settings.notifGameFinished &&
      settings.notifPronoWon &&
      settings.notifPronoLost &&
      settings.notifRankingUp &&
      settings.notifRankingDown &&
      settings.notifBadgeUnlocked &&
      settings.notifStreakWarning &&
      settings.notifSomeonePassedYou
    : false;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#5096ff] animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Erreur lors du chargement</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-[#5096ff]/20 to-[#5096ff]/10 rounded-xl border border-[#5096ff]/30">
              <Bell className="h-8 w-8 text-[#5096ff]" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                Paramètres
              </h1>
              <p className="text-zinc-400 mt-1">
                Configure tes notifications et préférences
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* SECTION PRÉFÉRENCES */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <User className="h-6 w-6 text-[#5096ff]" />
              Préférences
            </h2>
          </div>

          {/* Profil */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <User className="h-6 w-6 text-[#5096ff]" />
              <h2 className="text-xl font-bold text-white">Profil</h2>
            </div>

            <div className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                <div className="flex items-center gap-4">
                  {userImage ? (
                    <img
                      src={userImage}
                      alt="Avatar"
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-[#5096ff] to-[#ff5050] flex items-center justify-center">
                      <span className="text-lg font-bold text-white">
                        {userName.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-white">Photo de profil</p>
                    <p className="text-sm text-zinc-400 mt-1">
                      {userImage ? "Modifier votre avatar" : "Ajouter un avatar"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAvatarModal(true)}
                  className="px-4 py-2 bg-[#5096ff] hover:bg-[#5096ff]/90 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Modifier
                </button>
              </div>

              {/* Surnom */}
              <div className="p-4 bg-zinc-800/50 rounded-xl">
                <label className="block mb-3">
                  <span className="font-medium text-white">Surnom / Nom d'affichage</span>
                  <p className="text-sm text-zinc-400 mt-1 mb-3">
                    Ce nom sera visible par tous les utilisateurs
                  </p>
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#5096ff] focus:border-transparent"
                    placeholder="Ton surnom"
                  />
                  <button
                    onClick={handleSaveNickname}
                    disabled={savingProfile || nickname === userName}
                    className="px-6 py-3 bg-[#5096ff] hover:bg-[#5096ff]/90 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center gap-2"
                  >
                    {savingProfile ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Sauvegarder
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Favoris */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Trophy className="h-6 w-6 text-[#5096ff]" />
              <h2 className="text-xl font-bold text-white">Favoris</h2>
            </div>

            <div className="space-y-6">
              {/* Équipe favorite */}
              <div className="p-4 bg-zinc-800/50 rounded-xl">
                <label className="block mb-3">
                  <span className="font-medium text-white">Équipe favorite</span>
                  <p className="text-sm text-zinc-400 mt-1 mb-3">
                    Votre équipe NBA préférée (optionnel)
                  </p>
                </label>
                {favoriteTeam ? (
                  <div className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-700 rounded-lg">
                    <img
                      src={favoriteTeam.logoUrl}
                      alt={favoriteTeam.abbreviation}
                      className="w-12 h-12 object-contain"
                    />
                    <div className="flex-1">
                      <p className="text-white font-semibold">
                        {favoriteTeam.city} {favoriteTeam.name}
                      </p>
                      <p className="text-sm text-zinc-400">{favoriteTeam.abbreviation}</p>
                    </div>
                    <button
                      onClick={() => {
                        setFavoriteTeamId(null);
                        setFavoriteTeam(null);
                      }}
                      className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors text-sm"
                    >
                      Retirer
                    </button>
                  </div>
                ) : (
                  <p className="text-zinc-500 text-sm py-4">
                    Aucune équipe sélectionnée. Configurez vos favoris lors de la création du compte.
                  </p>
                )}
              </div>

              {/* Joueur favori */}
              <div className="p-4 bg-zinc-800/50 rounded-xl">
                <label className="block mb-3">
                  <span className="font-medium text-white">Joueur favori</span>
                  <p className="text-sm text-zinc-400 mt-1 mb-3">
                    Votre joueur NBA préféré (optionnel)
                  </p>
                </label>
                {favoritePlayer ? (
                  <div className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-700 rounded-lg">
                    {favoritePlayer.headshot ? (
                      <Image
                        src={favoritePlayer.headshot}
                        alt={favoritePlayer.fullName}
                        width={48}
                        height={48}
                        className="rounded-full object-cover border-2 border-zinc-600"
                      />
                    ) : favoritePlayer.team ? (
                      <Image
                        src={favoritePlayer.team.logoUrl}
                        alt={favoritePlayer.team.abbreviation}
                        width={48}
                        height={48}
                        className="object-contain"
                      />
                    ) : null}
                    <div className="flex-1">
                      <p className="text-white font-semibold">
                        {favoritePlayer.fullName}
                      </p>
                      <p className="text-sm text-zinc-400">
                        {favoritePlayer.position && `${favoritePlayer.position} • `}
                        {favoritePlayer.team?.abbreviation}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setFavoritePlayerId(null);
                        setFavoritePlayer(null);
                      }}
                      className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors text-sm"
                    >
                      Retirer
                    </button>
                  </div>
                ) : (
                  <p className="text-zinc-500 text-sm py-4">
                    Aucun joueur sélectionné. Configurez vos favoris lors de la création du compte.
                  </p>
                )}
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSaveFavorites}
                  disabled={savingFavorites}
                  className="px-6 py-3 bg-[#5096ff] hover:bg-[#5096ff]/90 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center gap-2"
                >
                  {savingFavorites ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Sauvegarder les favoris
                </button>
              </div>
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-zinc-800"></div>

          {/* SECTION NOTIFICATIONS */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Bell className="h-6 w-6 text-[#5096ff]" />
              Notifications
            </h2>
          </div>

          {/* Email Digest */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Mail className="h-6 w-6 text-[#5096ff]" />
              <h2 className="text-xl font-bold text-white">Email Quotidien</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                <div>
                  <p className="font-medium text-white">Recevoir le digest matinal</p>
                  <p className="text-sm text-zinc-400 mt-1">
                    Résumé quotidien avec tes résultats et pronos à faire
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.dailyEmailEnabled}
                    onChange={(e) => updateSetting("dailyEmailEnabled", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5096ff]"></div>
                </label>
              </div>

              {settings.dailyEmailEnabled && (
                <>
                  <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-xl ml-4 border-l-2 border-[#5096ff]/30">
                    <div>
                      <p className="font-medium text-white">Inclure les pronos manquants</p>
                      <p className="text-sm text-zinc-400 mt-1">
                        Rappel si tu n'as pas encore pronostiqué
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.emailIncludeMissing}
                        onChange={(e) => updateSetting("emailIncludeMissing", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5096ff]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-xl ml-4 border-l-2 border-[#5096ff]/30">
                    <div>
                      <p className="font-medium text-white">Inclure les résultats</p>
                      <p className="text-sm text-zinc-400 mt-1">
                        Résultats des matchs d'hier (révélés après clic bouton)
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.emailIncludeResults}
                        onChange={(e) => updateSetting("emailIncludeResults", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5096ff]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-xl ml-4 border-l-2 border-[#5096ff]/30">
                    <div>
                      <p className="font-medium text-white">Inclure l'évolution du classement</p>
                      <p className="text-sm text-zinc-400 mt-1">
                        Places gagnées/perdues au classement
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.emailIncludeRanking}
                        onChange={(e) => updateSetting("emailIncludeRanking", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5096ff]"></div>
                    </label>
                  </div>

                  <div className="p-4 bg-zinc-800/30 rounded-xl ml-4 border-l-2 border-[#5096ff]/30">
                    <p className="font-medium text-white mb-3">Fréquence</p>
                    <select
                      value={settings.emailFrequency}
                      onChange={(e) => updateSetting("emailFrequency", e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#5096ff]"
                    >
                      <option value="DAILY">Tous les jours</option>
                      <option value="WEEKDAYS">Lun-Ven uniquement</option>
                      <option value="WEEKLY">Une fois par semaine</option>
                      <option value="DISABLED">Désactivé</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Notifications Sociales */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Users className="h-6 w-6 text-green-500" />
              <h2 className="text-xl font-bold text-white">Notifications Sociales</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                <div>
                  <p className="font-medium text-white">Demandes d'ami</p>
                  <p className="text-sm text-zinc-400 mt-1">
                    Quand quelqu'un t'envoie une invitation
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifFriendRequest}
                    onChange={(e) => updateSetting("notifFriendRequest", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                <div>
                  <p className="font-medium text-white">Invitations à une ligue</p>
                  <p className="text-sm text-zinc-400 mt-1">
                    Quand tu es invité à rejoindre une compétition privée
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifLeagueInvitation}
                    onChange={(e) => updateSetting("notifLeagueInvitation", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                <div>
                  <p className="font-medium text-white">Début de ligue</p>
                  <p className="text-sm text-zinc-400 mt-1">
                    Quand une de tes ligues commence
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifLeagueStarted}
                    onChange={(e) => updateSetting("notifLeagueStarted", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
            </div>
          </section>

          {/* Notifications Rappels */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="h-6 w-6 text-yellow-500" />
              <h2 className="text-xl font-bold text-white">Rappels</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                <div>
                  <p className="font-medium text-white">Pronos manquants</p>
                  <p className="text-sm text-zinc-400 mt-1">
                    Rappel quand des matchs débutent et que tu n'as pas pronostiqué
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifReminderNoProno}
                    onChange={(e) => updateSetting("notifReminderNoProno", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                </label>
              </div>
            </div>
          </section>

          {/* Notifications Spoilers */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-red-500" />
                <h2 className="text-xl font-bold text-white">Notifications Spoilers</h2>
              </div>
              <button
                onClick={() => toggleAllSpoilers(!areAllSpoilersEnabled)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium text-white transition-all"
              >
                {areAllSpoilersEnabled ? (
                  <>
                    <Square className="h-4 w-4" />
                    Tout désactiver
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4" />
                    Tout activer
                  </>
                )}
              </button>
            </div>

            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-500">Attention aux spoilers</p>
                  <p className="text-sm text-red-400 mt-1">
                    Ces notifications peuvent révéler les scores et résultats. Elles sont
                    désactivées par défaut pour respecter ton mode no-spoil.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                  <div>
                    <p className="font-medium text-white">Match terminé</p>
                    <p className="text-sm text-zinc-400 mt-1">
                      Quand un match que tu as pronostiqué se termine
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifGameFinished}
                      onChange={(e) => updateSetting("notifGameFinished", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                  <div>
                    <p className="font-medium text-white">Prono gagné</p>
                    <p className="text-sm text-zinc-400 mt-1">
                      Quand tu gagnes un prono
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifPronoWon}
                      onChange={(e) => updateSetting("notifPronoWon", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                  <div>
                    <p className="font-medium text-white">Prono perdu</p>
                    <p className="text-sm text-zinc-400 mt-1">
                      Quand tu perds un prono
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifPronoLost}
                      onChange={(e) => updateSetting("notifPronoLost", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                  <div>
                    <p className="font-medium text-white">Progression au classement</p>
                    <p className="text-sm text-zinc-400 mt-1">
                      Quand tu gagnes des places
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifRankingUp}
                      onChange={(e) => updateSetting("notifRankingUp", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                  <div>
                    <p className="font-medium text-white">Régression au classement</p>
                    <p className="text-sm text-zinc-400 mt-1">
                      Quand tu perds des places
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifRankingDown}
                      onChange={(e) => updateSetting("notifRankingDown", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                  <div>
                    <p className="font-medium text-white">Badge débloqué</p>
                    <p className="text-sm text-zinc-400 mt-1">
                      Quand tu débloques un nouveau badge
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifBadgeUnlocked}
                      onChange={(e) => updateSetting("notifBadgeUnlocked", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                  <div>
                    <p className="font-medium text-white">Alerte série en danger</p>
                    <p className="text-sm text-zinc-400 mt-1">
                      Quand ta série de victoires est en jeu
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifStreakWarning}
                      onChange={(e) => updateSetting("notifStreakWarning", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                  <div>
                    <p className="font-medium text-white">Dépassement au classement</p>
                    <p className="text-sm text-zinc-400 mt-1">
                      Quand quelqu'un te dépasse au classement
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifSomeonePassedYou}
                      onChange={(e) => updateSetting("notifSomeonePassedYou", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                  </label>
                </div>
              </div>
          </section>

          {/* Save Button */}
          <div className="sticky bottom-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-[#5096ff] to-[#5096ff]/80 hover:from-[#5096ff]/90 hover:to-[#5096ff]/70 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#5096ff]/20"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Enregistrer les paramètres
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Avatar Upload Modal */}
      {showAvatarModal && (
        <AvatarUploadModal
          currentImage={userImage}
          userName={userName}
          onClose={() => setShowAvatarModal(false)}
          onImageUpdated={(newImageUrl) => {
            setUserImage(newImageUrl);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
