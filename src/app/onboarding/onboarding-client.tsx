"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, SkipForward } from "lucide-react";
import { completeOnboardingAction } from "@/actions/complete-onboarding.action";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { NameConfigurationStep } from "@/components/onboarding/name-configuration-step";
import { TeamSelectionStep } from "@/components/onboarding/team-selection-step";
import { PlayerSelectionStep } from "@/components/onboarding/player-selection-step";
import { AvatarUploadStep } from "@/components/onboarding/avatar-upload-step";

interface Team {
  id: string;
  name: string;
  city: string;
  abbreviation: string;
  logoUrl: string | null;
  conference: string;
}

interface OnboardingClientProps {
  userId: string;
  initialName: string;
  teams: Team[];
}

interface OnboardingData {
  firstName: string;
  lastName: string;
  particle: string;
  nickname: string;
  favoriteTeamId: string;
  favoritePlayerId: string;
  avatarUrl?: string;
}

/**
 * Orchestrateur du flow d'onboarding en 4 étapes
 *
 * Étape 1: Configuration du nom (prénom, particule, nom, surnom)
 * Étape 2: Sélection de l'équipe favorite
 * Étape 3: Sélection du joueur favori
 * Étape 4: Upload de l'avatar (optionnel)
 *
 * Gère la navigation entre les étapes et la soumission finale
 */
export function OnboardingClient(props: OnboardingClientProps) {
  const { userId, teams } = props;
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSkipModal, setShowSkipModal] = useState(false);

  // État global de toutes les données d'onboarding
  const [data, setData] = useState<OnboardingData>({
    firstName: "",
    lastName: "",
    particle: "",
    nickname: "",
    favoriteTeamId: "",
    favoritePlayerId: "",
    avatarUrl: undefined,
  });

  // Pre-fill name if coming from OAuth
  // TODO: Split initialName into firstName/lastName if present

  const handleNext = () => {
    setError(null);
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setError(null);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await completeOnboardingAction(data);

      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      // Success! Redirect to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
      setIsSubmitting(false);
    }
  };

  const updateData = (partial: Partial<OnboardingData>) => {
    setData({ ...data, ...partial });
  };

  const handleSkip = async () => {
    setShowSkipModal(false);
    setIsSubmitting(true);
    setError(null);

    try {
      // Appeler l'action avec le flag skip
      const result = await completeOnboardingAction({
        ...data,
        skip: true, // Utiliser les valeurs par défaut
      });

      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      // Success! Redirect to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md">
      {/* Overlay non-cliquable */}
      <div className="min-h-screen py-8 px-4 flex items-center justify-center">
        <div className="w-full max-w-4xl">
          {/* Skip Button - Top Right */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowSkipModal(true)}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
            >
              <SkipForward className="w-4 h-4" />
              Passer cette étape
            </button>
          </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Bienvenue dans Yeye Pronos !
          </h1>
          <p className="text-zinc-400 text-lg">
            Configurons votre profil en quelques étapes
          </p>
        </div>

        {/* Progress */}
        <OnboardingProgress currentStep={currentStep} totalSteps={4} />

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 rounded-xl p-4 mb-6">
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          {currentStep === 1 && (
            <NameConfigurationStep
              firstName={data.firstName}
              lastName={data.lastName}
              particle={data.particle}
              nickname={data.nickname}
              onUpdate={updateData}
              onNext={handleNext}
            />
          )}

          {currentStep === 2 && (
            <TeamSelectionStep
              teams={teams}
              selectedTeamId={data.favoriteTeamId}
              onSelect={(teamId) => updateData({ favoriteTeamId: teamId })}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {currentStep === 3 && (
            <PlayerSelectionStep
              selectedPlayerId={data.favoritePlayerId}
              onSelect={(playerId) => updateData({ favoritePlayerId: playerId })}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {currentStep === 4 && (
            <AvatarUploadStep
              userId={userId}
              currentAvatarUrl={data.avatarUrl}
              onAvatarChange={(url) => updateData({ avatarUrl: url })}
              onSubmit={handleSubmit}
              onBack={handleBack}
              isSubmitting={isSubmitting}
            />
          )}
        </div>

          {/* Footer Info */}
          <div className="text-center mt-6 text-zinc-500 text-sm">
            Vous pourrez modifier ces informations plus tard dans vos paramètres
          </div>
        </div>
      </div>

      {/* Skip Confirmation Modal */}
      {showSkipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md mx-4 bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h2 className="text-xl font-semibold text-white">
                Passer la configuration ?
              </h2>
              <button
                onClick={() => setShowSkipModal(false)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-zinc-300 mb-4">
                Vous pouvez passer cette étape et commencer à utiliser l&apos;application immédiatement.
              </p>
              <p className="text-zinc-400 text-sm mb-4">
                Un profil par défaut sera créé pour vous avec :
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm text-zinc-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#5096ff]"></div>
                  Surnom automatique basé sur votre code ami
                </li>
                <li className="flex items-center gap-2 text-sm text-zinc-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#5096ff]"></div>
                  Avatar par défaut
                </li>
                <li className="flex items-center gap-2 text-sm text-zinc-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#5096ff]"></div>
                  Aucune équipe ou joueur favori
                </li>
              </ul>
              <div className="bg-[#5096ff]/10 border border-[#5096ff]/30 rounded-lg p-4">
                <p className="text-sm text-[#5096ff]">
                  💡 Vous pourrez personnaliser votre profil à tout moment dans{" "}
                  <span className="font-semibold">Paramètres → Préférences</span>
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-800">
              <button
                onClick={() => setShowSkipModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSkip}
                disabled={isSubmitting}
                className="px-6 py-2 bg-[#5096ff] hover:bg-[#5096ff]/90 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all"
              >
                {isSubmitting ? "Finalisation..." : "Continuer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
