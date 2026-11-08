"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, LogOut, LayoutDashboard, Settings, ChevronDown, Users } from "lucide-react";
import type { User as PrismaUser } from "@/generated/prisma";
import { signOut } from "@/lib/auth-client";
import { toast } from "sonner";

interface NavbarProps {
  user: (Pick<PrismaUser, "id" | "name" | "email" | "role" | "image"> & {
    hasCompletedOnboarding?: boolean;
  }) | null;
  /** Sur mobile, la barre du haut de l'interface mobile prend la place (joueur connecté). */
  mobileHidden?: boolean;
}

export function Navbar({ user, mobileHidden = false }: NavbarProps) {
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => pathname === path;

  // Fermer le dropdown quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut({
      fetchOptions: {
        onRequest: () => {
          setIsPending(true);
        },
        onResponse: () => {
          setIsPending(false);
        },
        onError: (ctx) => {
          toast.error(ctx.error.message);
        },
        onSuccess: () => {
          toast.success("Déconnexion réussie. À bientôt !");
          window.location.href = "/";
        },
      },
    });
  };

  return (
    <nav className={`border-b border-zinc-800 bg-zinc-900/95 backdrop-blur-sm sticky top-0 z-50 ${mobileHidden ? "hidden md:block" : ""}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Yeye Pronos"
              className="h-10 w-auto"
            />
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href={user ? "/dashboard" : "/"}
              className={`text-sm font-medium transition-colors hover:text-[#ff5050] ${
                isActive("/") || isActive("/dashboard") ? "text-[#ff5050]" : "text-zinc-300"
              }`}
            >
              Accueil
            </Link>
            <Link
              href="/matchs"
              className={`text-sm font-medium transition-colors hover:text-[#5096ff] ${
                isActive("/matchs") ? "text-[#5096ff]" : "text-zinc-300"
              }`}
            >
              Matchs
            </Link>
            <Link
              href="/pronos"
              className={`text-sm font-medium transition-colors hover:text-[#5096ff] ${
                isActive("/pronos") ? "text-[#5096ff]" : "text-zinc-300"
              }`}
            >
              Mes Pronos
            </Link>
            <Link
              href="/classement"
              className={`text-sm font-medium transition-colors hover:text-[#dcff50] ${
                isActive("/classement") ? "text-[#dcff50]" : "text-zinc-300"
              }`}
            >
              Classement
            </Link>
            {/* Divider */}
            <div className="h-6 w-px bg-zinc-700"></div>

            {/* Stats NBA Link */}
            <Link
              href="/standings"
              className={`text-sm font-medium transition-colors hover:text-[#5096ff] ${
                isActive("/standings") || isActive("/teams") || isActive("/joueurs") || pathname?.startsWith("/joueurs/")
                  ? "text-[#5096ff]"
                  : "text-zinc-300"
              }`}
            >
              Stats NBA
            </Link>
            <Link
              href="/nba-cup"
              className={`text-sm font-medium transition-colors hover:text-amber-400 ${
                pathname === "/nba-cup" || pathname?.startsWith("/nba-cup/")
                  ? "text-amber-400"
                  : "text-zinc-300"
              }`}
            >
              NBA Cup
            </Link>
            <Link
              href="/playoffs"
              className={`text-sm font-medium transition-colors hover:text-yellow-400 ${
                pathname === "/playoffs" || pathname?.startsWith("/playoffs/")
                  ? "text-yellow-400"
                  : "text-zinc-300"
              }`}
            >
              Playoffs
            </Link>
            <Link
              href="/archives"
              className={`text-sm font-medium transition-colors hover:text-[#5096ff] ${
                isActive("/archives") || pathname?.startsWith("/archives/")
                  ? "text-[#5096ff]"
                  : "text-zinc-300"
              }`}
            >
              Archives
            </Link>
          </div>

          {/* Auth Actions */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="relative" ref={dropdownRef}>
                {/* User Menu Button */}
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all"
                >
                  {/* Avatar */}
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name}
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5096ff] to-[#ff5050] flex items-center justify-center">
                      <span className="text-xs font-bold text-white">
                        {user.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="hidden sm:inline">{user.name}</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg">
                    <div className="p-2">
                      {/* User Info Header */}
                      <div className="px-3 py-3 border-b border-zinc-800 mb-2">
                        <div className="flex items-center gap-3">
                          {/* Avatar dans le dropdown */}
                          {user.image ? (
                            <img
                              src={user.image}
                              alt={user.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#5096ff] to-[#ff5050] flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-bold text-white">
                                {user.name.slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                          )}
                          {/* Info utilisateur */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {user.name}
                            </p>
                            <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                            {user.role === "ADMIN" && (
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-yellow-500/20 text-yellow-500 rounded">
                                Admin
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <Link
                        href={user.hasCompletedOnboarding === false ? "/onboarding" : "/profile"}
                        onClick={(e) => {
                          if (user.hasCompletedOnboarding === false) {
                            e.preventDefault();
                            toast.info("Veuillez renseigner vos préférences d'abord !");
                            window.location.href = "/onboarding";
                          }
                          setIsDropdownOpen(false);
                        }}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                      >
                        <User className="h-4 w-4" />
                        Mon Profil
                      </Link>

                      <Link
                        href={user.hasCompletedOnboarding === false ? "/onboarding" : "/dashboard"}
                        onClick={(e) => {
                          if (user.hasCompletedOnboarding === false) {
                            e.preventDefault();
                            toast.info("Veuillez renseigner vos préférences d'abord !");
                            window.location.href = "/onboarding";
                          }
                          setIsDropdownOpen(false);
                        }}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Tableau de bord
                      </Link>

                      <Link
                        href={user.hasCompletedOnboarding === false ? "/onboarding" : "/amis"}
                        onClick={(e) => {
                          if (user.hasCompletedOnboarding === false) {
                            e.preventDefault();
                            toast.info("Veuillez renseigner vos préférences d'abord !");
                            window.location.href = "/onboarding";
                          }
                          setIsDropdownOpen(false);
                        }}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                      >
                        <Users className="h-4 w-4" />
                        Mes Amis
                      </Link>

                      <Link
                        href={user.hasCompletedOnboarding === false ? "/onboarding" : "/parametres"}
                        onClick={(e) => {
                          if (user.hasCompletedOnboarding === false) {
                            e.preventDefault();
                            toast.info("Veuillez renseigner vos préférences d'abord !");
                            window.location.href = "/onboarding";
                          }
                          setIsDropdownOpen(false);
                        }}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        Paramètres
                      </Link>

                      {user.role === "ADMIN" && (
                        <>
                          <div className="my-2 border-t border-zinc-800" />
                          <Link
                            href="/admin/dashboard"
                            onClick={() => setIsDropdownOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                          >
                            Admin Dashboard
                          </Link>
                        </>
                      )}

                      <div className="my-2 border-t border-zinc-800" />

                      <Link
                        href="/auth/clear-cookies"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                      >
                        <User className="h-4 w-4" />
                        Changer de compte
                      </Link>

                      <button
                        onClick={handleLogout}
                        disabled={isPending}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <LogOut className="h-4 w-4" />
                        {isPending ? "Déconnexion..." : "Déconnexion"}
                      </button>
                    </div>
                  </div>
                )}
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-sm font-medium text-zinc-300 hover:text-white transition-colors"
                >
                  Connexion
                </Link>
                <Link
                  href="/auth/register"
                  className="px-4 py-2 text-sm font-medium bg-[#ff5050] hover:bg-[#ff5050]/90 text-white rounded-lg transition-colors"
                >
                  S&apos;inscrire
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
