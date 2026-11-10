"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive, BarChart3, BookOpen, ChevronRight, LogOut, Medal, Settings, Shield, Trophy, User, Users, X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { signOut } from "@/lib/auth-client";
import { IS_BETA } from "@/lib/beta";
import { BugReportButton } from "@/components/feedback/bug-report";
import { Avatar, fmtNumber, ordinal } from "./ui";
import { useHud, useHudSync } from "./use-hud";

export interface MobileUser {
  name: string;
  image: string | null;
  role: string;
}

/**
 * Barre du haut sur mobile (remplace la barre de navigation) : logo, rang, points, avatar.
 * L'avatar ouvre le menu (Stats NBA, profil, amis, paris de saison, réglages…). Hauteur 4rem, comme la barre
 * ordinateur : les sous-menus collants (top-16) restent bien placés.
 */
export function MobileTopBar({ user }: { user: MobileUser }) {
  useHudSync();
  const hud = useHud();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 h-16 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md md:hidden">
        <div className="flex h-full items-center justify-between gap-3 px-4">
          <Link href="/dashboard" className="flex-shrink-0" aria-label="Accueil">
            <img src="/logo.png" alt="Yeye Pronos" className="h-8 w-auto" />
          </Link>

          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/classement"
              className="flex h-9 items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-3 text-sm font-bold text-white active:scale-95 transition-transform"
              aria-label="Mon classement"
            >
              <Trophy className="h-4 w-4 text-amber-400" />
              {hud?.rank ? ordinal(hud.rank) : "–"}
            </Link>
            <Link
              href="/pronos"
              className="flex h-9 items-center gap-1 rounded-full bg-[#dcff50]/10 px-3 text-sm font-black tabular-nums text-[#dcff50] ring-1 ring-[#dcff50]/25 active:scale-95 transition-transform"
              aria-label="Mes points"
            >
              {hud ? fmtNumber(hud.points) : "–"}
              <span className="text-[10px] font-bold uppercase opacity-70">pts</span>
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="rounded-full ring-2 ring-zinc-800 active:scale-95 transition-transform"
              aria-label="Ouvrir le menu"
            >
              <Avatar name={user.name} image={user.image} size={36} />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && <MobileMenu user={user} onClose={() => setMenuOpen(false)} />}
    </>
  );
}

/** Raccourcis du menu, sous le gros bouton « Stats NBA » (qui ouvre tout le contenu NBA : /nba). */
const TILES: { href: string; label: string; icon: LucideIcon; tint: string }[] = [
  { href: "/pronos/preseason", label: "Paris de saison", icon: Medal,    tint: "bg-amber-400/15 text-amber-400" },
  { href: "/amis",             label: "Amis",            icon: Users,    tint: "bg-[#ff5050]/15 text-[#ff5050]" },
  { href: "/pronos/regles",    label: "Règles",          icon: BookOpen, tint: "bg-[#5096ff]/15 text-[#5096ff]" },
];

function MobileMenu({ user, onClose }: { user: MobileUser; onClose: () => void }) {
  const pathname = usePathname();
  const hud = useHud();
  const [leaving, setLeaving] = useState(false);

  // Se ferme dès qu'on change de page
  const [openedOn] = useState(pathname);
  useEffect(() => { if (pathname !== openedOn) onClose(); }, [pathname, openedOn, onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const logout = async () => {
    setLeaving(true);
    await signOut({
      fetchOptions: {
        onError: (ctx) => { setLeaving(false); toast.error(ctx.error.message); },
        onSuccess: () => { window.location.href = "/"; },
      },
    });
  };

  const rows: { href: string; label: string; icon: LucideIcon }[] = [
    { href: "/profile",       label: "Mon profil",        icon: User },
    { href: "/archives",      label: "Saisons passées",   icon: Archive },
    { href: "/parametres",    label: "Paramètres",        icon: Settings },
    ...(user.role === "ADMIN" ? [{ href: "/admin/dashboard", label: "Administration", icon: Shield }] : []),
  ];

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative flex max-h-[88vh] w-full flex-col rounded-t-3xl border-t border-zinc-800 bg-zinc-900 animate-in slide-in-from-bottom-8 duration-200"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto mt-3 h-1 w-10 flex-shrink-0 rounded-full bg-zinc-700" />

        {/* Profil */}
        <div className="flex items-center gap-3 px-5 pb-4 pt-4">
          <Link href="/profile" onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar name={user.name} image={user.image} size={52} />
            <div className="min-w-0">
              <p className="truncate text-lg font-black text-white">{user.name}</p>
              <p className="text-sm text-zinc-400">
                {hud ? (
                  <>
                    <b className="text-[#dcff50]">{fmtNumber(hud.points)} pts</b>
                    {hud.rank && <> · {ordinal(hud.rank)} sur {hud.totalPlayers}</>}
                  </>
                ) : "Voir mon profil"}
              </p>
            </div>
          </Link>
          <button type="button" onClick={onClose} aria-label="Fermer"
            className="rounded-full bg-zinc-800 p-2 text-zinc-400 active:bg-zinc-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 pb-4">
          {/* Stats NBA : tout le contenu NBA (classements, joueurs, leaders, NBA Cup, playoffs…) */}
          <Link
            href="/nba"
            onClick={onClose}
            className="mb-2 flex items-center gap-3 rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-emerald-400/15 via-zinc-950/60 to-zinc-950/60 p-3.5 active:scale-[0.98] transition-transform"
          >
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-400/20 text-emerald-400">
              <BarChart3 className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-black text-white">Stats NBA</span>
              <span className="block truncate text-xs text-zinc-400">Classements, joueurs, leaders, NBA Cup, playoffs…</span>
            </span>
            <ChevronRight className="h-5 w-5 flex-shrink-0 text-emerald-400" />
          </Link>

          {/* Raccourcis */}
          <div className="grid grid-cols-3 gap-2">
            {TILES.map(({ href, label, icon: Icon, tint }) => (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className="flex flex-col items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-2 py-3.5 text-center active:scale-95 transition-transform"
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tint}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-semibold leading-tight text-zinc-200">{label}</span>
              </Link>
            ))}
          </div>

          {/* Liens */}
          <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-1">
            {rows.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={onClose}
                className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-zinc-200 active:bg-zinc-800">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800">
                  <Icon className="h-4 w-4 text-zinc-400" />
                </span>
                <span className="flex-1">{label}</span>
                <ChevronRight className="h-4 w-4 text-zinc-600" />
              </Link>
            ))}
            <BugReportButton loggedIn variant="menu" />
            <button
              type="button"
              onClick={logout}
              disabled={leaving}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-[#ff5050] active:bg-zinc-800 disabled:opacity-50"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ff5050]/10">
                <LogOut className="h-4 w-4" />
              </span>
              {leaving ? "Déconnexion…" : "Déconnexion"}
            </button>
          </div>

          {/* Mentions */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
            {IS_BETA && (
              <span className="rounded-md bg-[#5096ff]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#5096ff]">Bêta</span>
            )}
            <Link href="/legal/mentions" onClick={onClose} className="active:text-zinc-300">Mentions légales</Link>
            <Link href="/legal/confidentialite" onClick={onClose} className="active:text-zinc-300">Confidentialité</Link>
            <Link href="/legal/cgu" onClick={onClose} className="active:text-zinc-300">CGU</Link>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
