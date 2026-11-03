"use client";

import { useState } from "react";
import { Trash2, CheckCircle, AlertCircle } from "lucide-react";

export default function ClearCookiesPage() {
  const [isClearing, setIsClearing] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const clearAllCookies = async () => {
    setIsClearing(true);

    try {
      // Méthode 1: Via l'API
      const response = await fetch("/api/clear-session");

      if (response.ok) {
        // Méthode 2: Supprimer tous les cookies côté client aussi
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });

        setStatus("success");

        // Rediriger après 2 secondes
        setTimeout(() => {
          window.location.href = "/auth/login";
        }, 2000);
      } else {
        setStatus("error");
      }
    } catch {
      // Si l'API échoue, essayer de supprimer les cookies côté client uniquement
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      setStatus("success");
      setTimeout(() => {
        window.location.href = "/auth/login";
      }, 2000);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
              <Trash2 className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Réinitialiser la session</h1>
              <p className="text-sm text-zinc-400">Supprimer tous les cookies</p>
            </div>
          </div>

          {/* Status Messages */}
          {status === "idle" && (
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm text-yellow-500 font-medium">
                    Erreur 431 détectée
                  </p>
                  <p className="text-xs text-yellow-400">
                    Votre session contient des données trop volumineuses.
                    Cliquez sur le bouton ci-dessous pour tout réinitialiser.
                  </p>
                </div>
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm text-green-500 font-medium">
                    Cookies supprimés avec succès !
                  </p>
                  <p className="text-xs text-green-400">
                    Redirection vers la page de connexion...
                  </p>
                </div>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm text-red-500 font-medium">
                    Erreur lors de la suppression
                  </p>
                  <p className="text-xs text-red-400">
                    Veuillez supprimer manuellement les cookies depuis les DevTools (F12 → Application → Cookies).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-4">
            <button
              onClick={clearAllCookies}
              disabled={isClearing || status === "success"}
              className="w-full px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {isClearing ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Suppression en cours...
                </>
              ) : status === "success" ? (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Terminé !
                </>
              ) : (
                <>
                  <Trash2 className="h-5 w-5" />
                  Supprimer tous les cookies
                </>
              )}
            </button>

            {status === "idle" && (
              <div className="pt-4 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 text-center">
                  Cette action vous déconnectera et supprimera toutes vos données de session locales.
                  Vous pourrez vous reconnecter immédiatement après.
                </p>
              </div>
            )}
          </div>

          {/* Manual Instructions */}
          <details className="mt-6">
            <summary className="text-sm text-zinc-400 cursor-pointer hover:text-white transition-colors">
              Instructions manuelles (si le bouton ne fonctionne pas)
            </summary>
            <div className="mt-3 p-4 bg-zinc-800/50 rounded-lg space-y-2 text-xs text-zinc-400">
              <p className="font-medium text-zinc-300">Méthode Chrome/Edge :</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Appuyez sur F12 pour ouvrir les DevTools</li>
                <li>Allez dans l&apos;onglet &quot;Application&quot;</li>
                <li>Dans le menu de gauche, cliquez sur &quot;Cookies&quot;</li>
                <li>Sélectionnez &quot;http://localhost:3000&quot;</li>
                <li>Cliquez sur &quot;Clear all cookies&quot; (icône ⛔)</li>
                <li>Fermez les DevTools et rechargez la page</li>
              </ol>
              <p className="font-medium text-zinc-300 mt-4">Méthode Firefox :</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Appuyez sur F12 pour ouvrir les DevTools</li>
                <li>Allez dans l&apos;onglet &quot;Stockage&quot;</li>
                <li>Cliquez sur &quot;Cookies&quot; puis &quot;http://localhost:3000&quot;</li>
                <li>Faites clic-droit et sélectionnez &quot;Tout supprimer&quot;</li>
                <li>Fermez les DevTools et rechargez la page</li>
              </ol>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
