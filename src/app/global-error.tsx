"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="bg-zinc-950 text-white flex items-center justify-center min-h-screen">
        <div className="max-w-md w-full text-center px-4">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-red-500/10 rounded-full border border-red-500/20">
              <AlertTriangle className="h-10 w-10 text-red-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Erreur critique</h1>
          <p className="text-zinc-400 mb-8">
            Une erreur inattendue s&apos;est produite. Veuillez recharger la page.
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#5096ff] hover:bg-[#5096ff]/80 text-white font-medium rounded-lg transition-colors"
          >
            <RefreshCcw className="h-4 w-4" />
            Recharger
          </button>
        </div>
      </body>
    </html>
  );
}
