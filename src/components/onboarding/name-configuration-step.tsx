"use client";

import { useState } from "react";
import { User, ChevronDown, ChevronUp } from "lucide-react";

interface NameConfigurationStepProps {
  firstName: string;
  lastName: string;
  particle: string;
  nickname: string;
  onUpdate: (data: {
    firstName?: string;
    lastName?: string;
    particle?: string;
    nickname?: string;
  }) => void;
  onNext: () => void;
}

const PARTICLES = [
  { value: "", label: "Aucune" },
  { value: "de", label: "de" },
  { value: "de la", label: "de la" },
  { value: "du", label: "du" },
  { value: "des", label: "des" },
  { value: "van", label: "van" },
  { value: "von", label: "von" },
  { value: "di", label: "di" },
  { value: "da", label: "da" },
];

/**
 * Étape 1: Configuration du nom complet
 *
 * SURNOM OBLIGATOIRE en priorité
 * Nom complet optionnel (prénom, particule, nom)
 */
export function NameConfigurationStep({
  firstName,
  lastName,
  particle,
  nickname,
  onUpdate,
  onNext,
}: NameConfigurationStepProps) {
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    nickname?: string;
  }>({});

  const [showOptionalFields, setShowOptionalFields] = useState(false);

  const nameRegex = /^[a-zA-ZÀ-ÿ\-]+$/;

  const validateAndUpdate = (
    field: "firstName" | "lastName" | "nickname",
    value: string
  ) => {
    // Remove spaces
    const cleaned = value.replace(/\s/g, "");

    // Validate format
    if (cleaned && !nameRegex.test(cleaned)) {
      setErrors({
        ...errors,
        [field]: "Seulement des lettres et des tirets autorisés",
      });
      return;
    }

    // Clear error
    setErrors({ ...errors, [field]: undefined });

    // Update
    onUpdate({ [field]: cleaned });
  };

  const handleNext = () => {
    const newErrors: typeof errors = {};

    // SURNOM OBLIGATOIRE
    if (!nickname.trim()) {
      newErrors.nickname = "Le surnom est obligatoire";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onNext();
  };

  // Build preview
  const capitalize = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

  const fullNamePreview =
    firstName && lastName
      ? particle
        ? `${capitalize(firstName)} ${particle} ${capitalize(lastName)}`
        : `${capitalize(firstName)} ${capitalize(lastName)}`
      : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
          <User className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Choisis ton surnom
        </h2>
        <p className="text-zinc-400">
          C&apos;est ainsi que tu seras connu dans le classement
        </p>
      </div>

      {/* SURNOM - Champ principal obligatoire */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Surnom <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => validateAndUpdate("nickname", e.target.value)}
          placeholder="LeBronFan, KobeMamba, CurryShooter..."
          className={`w-full px-4 py-4 text-lg bg-zinc-800 border ${
            errors.nickname ? "border-red-500" : "border-zinc-700"
          } rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
          autoFocus
        />
        {errors.nickname && (
          <p className="text-red-500 text-xs mt-1">{errors.nickname}</p>
        )}
        <p className="text-xs text-zinc-500 mt-2">
          Choisis un surnom unique et mémorable pour ton profil
        </p>
      </div>

      {/* Preview du surnom */}
      {nickname && (
        <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-xl p-4">
          <p className="text-xs text-zinc-400 mb-1">Aperçu</p>
          <p className="text-2xl font-bold text-white">
            &quot;{capitalize(nickname)}&quot;
          </p>
          {fullNamePreview && (
            <p className="text-sm text-zinc-400 mt-1">{fullNamePreview}</p>
          )}
        </div>
      )}

      {/* Toggle pour champs optionnels */}
      <button
        type="button"
        onClick={() => setShowOptionalFields(!showOptionalFields)}
        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-300 hover:bg-zinc-800 transition-all"
      >
        <span className="text-sm font-medium">
          {showOptionalFields
            ? "Masquer les champs optionnels"
            : "Ajouter prénom et nom (optionnel)"}
        </span>
        {showOptionalFields ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {/* Champs optionnels : Prénom, Particule, Nom */}
      {showOptionalFields && (
        <div className="space-y-4 p-4 bg-zinc-800/30 border border-zinc-700 rounded-xl">
          <p className="text-xs text-zinc-500 mb-3">
            Ces informations sont optionnelles et n&apos;apparaîtront que si tu les remplis
          </p>

          {/* Name Inputs - Line 1 */}
          <div className="grid grid-cols-12 gap-3">
            {/* Prénom */}
            <div className="col-span-5">
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Prénom
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => validateAndUpdate("firstName", e.target.value)}
                placeholder="Jean"
                className={`w-full px-4 py-3 bg-zinc-800 border ${
                  errors.firstName ? "border-red-500" : "border-zinc-700"
                } rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
              />
              {errors.firstName && (
                <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>
              )}
            </div>

            {/* Particule */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Particule
              </label>
              <select
                value={particle}
                onChange={(e) => onUpdate({ particle: e.target.value })}
                className="w-full px-3 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                {PARTICLES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Nom */}
            <div className="col-span-5">
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Nom
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => validateAndUpdate("lastName", e.target.value)}
                placeholder="Dupont"
                className={`w-full px-4 py-3 bg-zinc-800 border ${
                  errors.lastName ? "border-red-500" : "border-zinc-700"
                } rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
              />
              {errors.lastName && (
                <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
        <p className="text-sm text-zinc-400">
          ⚠️ Pas d&apos;espaces autorisés. Seuls les lettres et tirets (-) sont acceptés.
        </p>
      </div>

      {/* Action */}
      <button
        onClick={handleNext}
        disabled={!nickname.trim()}
        className={`w-full font-semibold py-4 rounded-xl transition-all duration-300 ${
          nickname.trim()
            ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl"
            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
        }`}
      >
        Continuer
      </button>
    </div>
  );
}
