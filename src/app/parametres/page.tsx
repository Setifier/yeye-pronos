"use client";

import { useState, useEffect } from "react";
import { redirect, useRouter } from "next/navigation";
import Image from "next/image";
import {
  Loader2,
  Save,
  User,
  Camera,
  Trophy,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { AvatarUploadModal } from "@/components/profile/avatar-upload-modal";

export default function ParametresPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Profil
  const [nickname, setNickname] = useState("");
  const [userImage, setUserImage] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Favoris
  const [favoriteTeamId, setFavoriteTeamId] = useState<string | null>(null);
  const [favoritePlayerId, setFavoritePlayerId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [favoriteTeam, setFavoriteTeam] = useState<Record<string, any> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [favoritePlayer, setFavoritePlayer] = useState<Record<string, any> | null>(null);
  const [savingFavorites, setSavingFavorites] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/profile");

      if (res.status === 401) {
        redirect("/auth/login");
        return;
      }

      if (!res.ok) throw new Error("Erreur lors du chargement");

      const data = await res.json();
      setNickname(data.name);
      setUserName(data.name);
      setUserImage(data.image);
      setFavoriteTeamId(data.favoriteTeamId);
      setFavoritePlayerId(data.favoritePlayerId);
      setFavoriteTeam(data.favoriteTeam);
      setFavoritePlayer(data.favoritePlayer);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Erreur lors du chargement");
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
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nickname.trim() }),
      });

      if (!res.ok) throw new Error("Erreur lors de la mise à jour");

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
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          favoriteTeamId:   favoriteTeamId   || null,
          favoritePlayerId: favoritePlayerId || null,
        }),
      });

      if (!res.ok) throw new Error("Erreur lors de la mise à jour");

      toast.success("Favoris mis à jour !");
      router.refresh();
    } catch (error) {
      console.error("Error updating favorites:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setSavingFavorites(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#5096ff] animate-spin" />
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
              <Settings className="h-8 w-8 text-[#5096ff]" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                Paramètres
              </h1>
              <p className="text-zinc-400 mt-1">
                Gérez votre profil et vos préférences
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">

          {/* ── Profil ── */}
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
                  <span className="font-medium text-white">
                    Surnom / Nom d&apos;affichage
                  </span>
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

          {/* ── Favoris ── */}
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
                      onClick={() => { setFavoriteTeamId(null); setFavoriteTeam(null); }}
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
                      <p className="text-white font-semibold">{favoritePlayer.fullName}</p>
                      <p className="text-sm text-zinc-400">
                        {favoritePlayer.position && `${favoritePlayer.position} • `}
                        {favoritePlayer.team?.abbreviation}
                      </p>
                    </div>
                    <button
                      onClick={() => { setFavoritePlayerId(null); setFavoritePlayer(null); }}
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
