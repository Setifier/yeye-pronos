"use client";

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
}

/**
 * Barre de progression pour l'onboarding
 * Affiche les étapes et l'étape courante
 */
export function OnboardingProgress({
  currentStep,
  totalSteps,
}: OnboardingProgressProps) {
  const steps = [
    { number: 1, label: "Nom" },
    { number: 2, label: "Équipe" },
    { number: 3, label: "Joueur" },
    { number: 4, label: "Avatar" },
  ];

  return (
    <div className="mb-8">
      {/* Progress Bar */}
      <div className="relative">
        {/* Background line */}
        <div className="absolute top-5 left-0 right-0 h-1 bg-zinc-800" />

        {/* Active line */}
        <div
          className="absolute top-5 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500"
          style={{
            width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
          }}
        />

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step) => {
            const isActive = step.number === currentStep;
            const isCompleted = step.number < currentStep;

            return (
              <div key={step.number} className="flex flex-col items-center">
                {/* Circle */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                    isCompleted
                      ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white"
                      : isActive
                      ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white scale-110"
                      : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {step.number}
                </div>

                {/* Label */}
                <span
                  className={`mt-2 text-sm font-medium transition-colors duration-300 ${
                    isActive
                      ? "text-white"
                      : isCompleted
                      ? "text-blue-400"
                      : "text-zinc-500"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
