import Link from "next/link";
import { IS_BETA } from "@/lib/beta";
import { CREATOR } from "@/lib/legal";
import { BugReportButton } from "@/components/feedback/bug-report";

export function Footer({ loggedIn }: { loggedIn: boolean }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-800 bg-zinc-900 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <img
              src="/logo.png"
              alt="Yeye Pronos"
              className="h-8 w-auto mb-3"
            />
            <p className="text-sm text-zinc-400">
              Pronostiquez les matchs NBA et grimpez dans le classement !
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold text-zinc-300 mb-3">
              Navigation
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-sm text-zinc-400 hover:text-[#ff5050] transition-colors"
                >
                  Accueil
                </Link>
              </li>
              <li>
                <Link
                  href="/pronos"
                  className="text-sm text-zinc-400 hover:text-[#5096ff] transition-colors"
                >
                  Mes Pronos
                </Link>
              </li>
              <li>
                <Link
                  href="/classement"
                  className="text-sm text-zinc-400 hover:text-[#dcff50] transition-colors"
                >
                  Classement
                </Link>
              </li>
              <li>
                <Link
                  href="/playoffs"
                  className="text-sm text-zinc-400 hover:text-yellow-400 transition-colors"
                >
                  Playoffs
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-zinc-300 mb-3">Légal</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/legal/mentions"
                  className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
                >
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/confidentialite"
                  className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
                >
                  Politique de confidentialité
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/cgu"
                  className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
                >
                  Conditions d&apos;utilisation
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-zinc-800">
          <p className="text-xs text-center text-zinc-500">
            © {currentYear} Yeye Pronos · Créé par {CREATOR}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-center text-zinc-600">
            Les noms et logos des équipes appartiennent à la NBA et à ses équipes.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-zinc-500">
            {IS_BETA && (
              <span className="flex items-center gap-2">
                <span className="rounded-md bg-[#5096ff]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#5096ff]">
                  Bêta
                </span>
                Version de test : merci pour vos retours !
              </span>
            )}
            <BugReportButton loggedIn={loggedIn} variant="footer" />
          </div>
        </div>
      </div>
    </footer>
  );
}
