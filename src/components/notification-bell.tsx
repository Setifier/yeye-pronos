"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  X,
  Users,
  Trophy,
  TrendingUp,
  Calendar,
  Award,
  Flame,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { Notification, NotificationType } from "@/generated/prisma";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [failureCount, setFailureCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Fetch initial
    fetchNotifications();

    // Poll pour nouvelles notifications toutes les 30 secondes
    // Arrêter le polling après 3 échecs consécutifs
    intervalRef.current = setInterval(() => {
      if (failureCount < 3) {
        fetchNotifications();
      }
    }, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Pas de dépendances pour éviter les re-renders

  // Fermer le dropdown quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications?limit=10");

      if (!response.ok) {
        if (response.status === 401) {
          // Non authentifié, arrêter le polling
          setFailureCount(3);
          return;
        }
        throw new Error("Erreur lors du chargement");
      }

      const data = await response.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);

      // Réinitialiser le compteur d'échecs en cas de succès
      setFailureCount(0);
    } catch (error) {
      // Incrémenter le compteur d'échecs
      setFailureCount((prev) => prev + 1);

      // Ignorer les erreurs silencieusement (connection refused, réseau, etc.)
      // Ces erreurs peuvent se produire si le serveur n'est pas démarré ou inaccessible
      if (error instanceof TypeError && error.message.includes("fetch")) {
        // Erreur réseau (ERR_CONNECTION_REFUSED, etc.)
        return;
      }
      // Ne logger que si ce n'est pas une erreur réseau
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });

      if (!response.ok) {
        throw new Error("Erreur");
      }

      // Mettre à jour l'état local
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking as read:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });

      if (!response.ok) {
        throw new Error("Erreur");
      }

      // Mettre à jour l'état local
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("Toutes les notifications ont été marquées comme lues");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erreur");
      }

      // Mettre à jour l'état local
      const notification = notifications.find((n) => n.id === notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (notification && !notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const getIcon = (type: NotificationType) => {
    const iconMap: Record<NotificationType, JSX.Element> = {
      FRIEND_REQUEST: <Users className="h-4 w-4 text-green-500" />,
      LEAGUE_INVITATION: <Trophy className="h-4 w-4 text-yellow-500" />,
      LEAGUE_STARTED: <Calendar className="h-4 w-4 text-blue-500" />,
      GAME_FINISHED: <Trophy className="h-4 w-4 text-zinc-400" />,
      PRONO_WON: <Trophy className="h-4 w-4 text-green-500" />,
      PRONO_LOST: <X className="h-4 w-4 text-red-500" />,
      RANKING_UP: <TrendingUp className="h-4 w-4 text-green-500" />,
      RANKING_DOWN: <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />,
      BADGE_UNLOCKED: <Award className="h-4 w-4 text-purple-500" />,
      STREAK_WARNING: <Flame className="h-4 w-4 text-orange-500" />,
      SOMEONE_PASSED_YOU: <TrendingUp className="h-4 w-4 text-yellow-500" />,
      REMINDER_NO_PRONO: <Bell className="h-4 w-4 text-[#5096ff]" />,
      DAILY_DIGEST: <Calendar className="h-4 w-4 text-[#5096ff]" />,
    };

    return iconMap[type] || <Bell className="h-4 w-4 text-zinc-400" />;
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diff = now.getTime() - notifDate.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;

    return notifDate.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center h-5 w-5 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-[600px] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <h3 className="font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-[#5096ff] hover:text-[#5096ff]/80 transition-colors"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-[500px]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 text-[#5096ff] animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="p-3 bg-zinc-800 rounded-full mb-3">
                  <Bell className="h-6 w-6 text-zinc-600" />
                </div>
                <p className="text-sm text-zinc-400 text-center">
                  Aucune notification
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`group relative px-4 py-3 hover:bg-zinc-800/50 transition-all ${
                      !notif.read ? "bg-[#5096ff]/5" : ""
                    }`}
                  >
                    {/* Notification Content */}
                    <Link
                      href={notif.link || "#"}
                      onClick={() => {
                        if (!notif.read) {
                          markAsRead(notif.id);
                        }
                        setIsOpen(false);
                      }}
                      className="block"
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-1">
                          {getIcon(notif.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {notif.title}
                          </p>
                          <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-xs text-zinc-500 mt-1">
                            {formatTime(notif.createdAt)}
                          </p>
                        </div>

                        {/* Unread Indicator */}
                        {!notif.read && (
                          <div className="flex-shrink-0">
                            <div className="h-2 w-2 bg-[#5096ff] rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Actions (visible on hover) */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notif.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notif.id);
                          }}
                          className="p-1 rounded hover:bg-zinc-700 transition-colors"
                          title="Marquer comme lu"
                        >
                          <Check className="h-3 w-3 text-zinc-400" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notif.id);
                        }}
                        className="p-1 rounded hover:bg-zinc-700 transition-colors"
                        title="Supprimer"
                      >
                        <X className="h-3 w-3 text-zinc-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-zinc-800">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="block text-center text-sm text-[#5096ff] hover:text-[#5096ff]/80 transition-colors"
              >
                Voir toutes les notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
