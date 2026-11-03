"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

interface AdminHeaderProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

// Mapping des URLs vers des labels lisibles
const breadcrumbLabels: Record<string, string> = {
  "/admin": "Admin",
  "/admin/dashboard": "Dashboard",
  "/admin/users": "Utilisateurs",
  "/admin/games": "Matchs",
  "/admin/notifications": "Notifications",
  "/admin/settings": "Paramètres",
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AdminHeader(props: AdminHeaderProps) {
  const pathname = usePathname();

  // Générer le breadcrumb depuis le pathname
  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = "/" + pathSegments.slice(0, index + 1).join("/");
    const label = breadcrumbLabels[href] || segment;

    return { href, label };
  });

  return (
    <header className="bg-zinc-900 border-b border-zinc-800 px-8 py-4">
      <div className="flex items-center justify-between">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/admin/dashboard"
            className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
          >
            <Home className="w-4 h-4" />
          </Link>

          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;

            return (
              <div key={crumb.href} className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-zinc-600" />

                {isLast ? (
                  <span className="text-white font-medium">{crumb.label}</span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-zinc-400 hover:text-white transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        {/* Actions / User */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Retour au site
          </Link>
        </div>
      </div>
    </header>
  );
}
