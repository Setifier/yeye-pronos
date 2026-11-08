import { LegalNav } from "@/components/legal/legal-nav";
import { LEGAL_UPDATED_AT } from "@/lib/legal";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <LegalNav />
        <article className="mt-8 space-y-8">{children}</article>
        <p className="mt-12 border-t border-zinc-800 pt-6 text-xs text-zinc-600">
          Dernière mise à jour : {LEGAL_UPDATED_AT}
        </p>
      </div>
    </main>
  );
}
