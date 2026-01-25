"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  UsersIcon,
  TrophyIcon,
  AwardIcon,
  BellIcon,
  SettingsIcon,
} from "lucide-react";

interface AdminSidebarProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

const navItems = [
  {
    href: "/admin/dashboard",
    icon: HomeIcon,
    label: "Dashboard",
  },
  {
    href: "/admin/users",
    icon: UsersIcon,
    label: "Utilisateurs",
  },
  {
    href: "/admin/games",
    icon: TrophyIcon,
    label: "Matchs",
  },
  {
    href: "/admin/badges",
    icon: AwardIcon,
    label: "Badges",
  },
  {
    href: "/admin/notifications",
    icon: BellIcon,
    label: "Notifications",
  },
  {
    href: "/admin/settings",
    icon: SettingsIcon,
    label: "Paramètres",
  },
];

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
      {/* Logo / Brand */}
      <div className="p-6 border-b border-zinc-800">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-[#5096ff] to-[#5096ff]/60 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <div>
            <h1 className="font-bold text-white">Admin Panel</h1>
            <p className="text-xs text-zinc-500">NBA Pronos</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg
                transition-all duration-200
                ${
                  isActive
                    ? "bg-zinc-800 text-white border-l-2 border-[#5096ff]"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User info at bottom */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-800/50">
          <div className="w-10 h-10 bg-gradient-to-br from-[#5096ff] to-[#dcff50] rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user.name}
            </p>
            <p className="text-xs text-zinc-500 truncate">{user.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
