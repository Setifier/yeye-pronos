import Link from "next/link";
import { getContactEmail } from "@/lib/legal";

/** Titre de page légale. */
export function LegalTitle({ children, intro }: { children: React.ReactNode; intro?: React.ReactNode }) {
  return (
    <header>
      <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{children}</h1>
      {intro && <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{intro}</p>}
    </header>
  );
}

/** Section d'une page légale. */
export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-bold text-white">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-zinc-400">{children}</div>
    </section>
  );
}

/** Liste à puces. */
export function LegalList({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5 marker:text-zinc-600">{children}</ul>;
}

/** Mise en avant dans le texte. */
export function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-zinc-200">{children}</strong>;
}

/** Lien interne. */
export function LegalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-[#5096ff] hover:underline">
      {children}
    </Link>
  );
}

/** Adresse de contact (CONTACT_EMAIL). */
export function ContactEmail() {
  const email = getContactEmail();
  if (!email) return <span className="text-zinc-500">(adresse de contact bientôt disponible)</span>;
  return (
    <a href={`mailto:${email}`} className="text-[#5096ff] hover:underline">
      {email}
    </a>
  );
}
