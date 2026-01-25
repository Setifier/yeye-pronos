/**
 * Service de gestion des notifications
 * Respecte les préférences anti-spoil de l'utilisateur
 */

import { NotificationType } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}

/**
 * Créer une notification pour un utilisateur
 * Vérifie automatiquement les préférences utilisateur avant de créer
 */
export async function createNotification(params: CreateNotificationParams) {
  const { userId, type, title, message, link, metadata } = params;

  // Récupérer les préférences de l'utilisateur
  const settings = await prisma.userNotificationSettings.findUnique({
    where: { userId },
  });

  // Si pas de settings, créer avec les valeurs par défaut
  if (!settings) {
    await prisma.userNotificationSettings.create({
      data: { userId },
    });
  }

  // Vérifier si ce type de notification est activé
  const isEnabled = checkNotificationEnabled(type, settings);

  if (!isEnabled) {
    // L'utilisateur a désactivé ce type de notification
    console.log(`[Notification] Type ${type} désactivé pour user ${userId}`);
    return null;
  }

  // Créer la notification
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      link,
      metadata: metadata || {},
    },
  });

  console.log(`[Notification] Créée: ${type} pour user ${userId}`);
  return notification;
}

/**
 * Créer des notifications pour plusieurs utilisateurs
 */
export async function createNotificationBulk(
  userIds: string[],
  params: Omit<CreateNotificationParams, "userId">
) {
  const notifications = await Promise.all(
    userIds.map((userId) => createNotification({ ...params, userId }))
  );

  return notifications.filter((n) => n !== null);
}

/**
 * Marquer une notification comme lue
 */
export async function markNotificationAsRead(notificationId: string, userId: string) {
  const notification = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId, // Sécurité: vérifier que la notif appartient à l'utilisateur
    },
    data: {
      read: true,
    },
  });

  return notification;
}

/**
 * Marquer toutes les notifications comme lues
 */
export async function markAllNotificationsAsRead(userId: string) {
  const notifications = await prisma.notification.updateMany({
    where: {
      userId,
      read: false,
    },
    data: {
      read: true,
    },
  });

  return notifications;
}

/**
 * Récupérer les notifications d'un utilisateur
 */
export async function getUserNotifications(
  userId: string,
  options: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { unreadOnly = false, limit = 50, offset = 0 } = options;

  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly && { read: false }),
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    skip: offset,
  });

  return notifications;
}

/**
 * Compter les notifications non lues
 */
export async function getUnreadCount(userId: string) {
  const count = await prisma.notification.count({
    where: {
      userId,
      read: false,
    },
  });

  return count;
}

/**
 * Supprimer une notification
 */
export async function deleteNotification(notificationId: string, userId: string) {
  const notification = await prisma.notification.deleteMany({
    where: {
      id: notificationId,
      userId, // Sécurité
    },
  });

  return notification;
}

/**
 * Supprimer toutes les notifications lues
 */
export async function deleteReadNotifications(userId: string) {
  const notifications = await prisma.notification.deleteMany({
    where: {
      userId,
      read: true,
    },
  });

  return notifications;
}

// ============================================
// HELPERS INTERNES
// ============================================

/**
 * Vérifier si un type de notification est activé pour l'utilisateur
 */
function checkNotificationEnabled(
  type: NotificationType,
  settings: any | null
): boolean {
  // Si pas de settings, utiliser les valeurs par défaut
  if (!settings) {
    return getDefaultEnabledState(type);
  }

  // Mapper le type de notification au champ de settings
  const settingKey = getSettingKeyForType(type);

  if (!settingKey) {
    // Type inconnu, ne pas créer
    return false;
  }

  return settings[settingKey] === true;
}

/**
 * Obtenir l'état par défaut (activé/désactivé) d'un type de notification
 */
function getDefaultEnabledState(type: NotificationType): boolean {
  // Social: activé par défaut
  const socialTypes: NotificationType[] = [
    "FRIEND_REQUEST",
    "LEAGUE_INVITATION",
    "LEAGUE_STARTED",
  ];

  // Rappels: activé par défaut
  const reminderTypes: NotificationType[] = [
    "REMINDER_NO_PRONO",
    "DAILY_DIGEST",
  ];

  // Spoilers: désactivé par défaut
  const spoilerTypes: NotificationType[] = [
    "GAME_FINISHED",
    "PRONO_WON",
    "PRONO_LOST",
    "RANKING_UP",
    "RANKING_DOWN",
    "BADGE_UNLOCKED",
    "STREAK_WARNING",
    "SOMEONE_PASSED_YOU",
  ];

  if (socialTypes.includes(type) || reminderTypes.includes(type)) {
    return true;
  }

  if (spoilerTypes.includes(type)) {
    return false;
  }

  // Par défaut: désactivé (sécurité)
  return false;
}

/**
 * Mapper un type de notification au champ de settings correspondant
 */
function getSettingKeyForType(type: NotificationType): string | null {
  const mapping: Record<NotificationType, string> = {
    FRIEND_REQUEST: "notifFriendRequest",
    LEAGUE_INVITATION: "notifLeagueInvitation",
    LEAGUE_STARTED: "notifLeagueStarted",
    GAME_FINISHED: "notifGameFinished",
    PRONO_WON: "notifPronoWon",
    PRONO_LOST: "notifPronoLost",
    RANKING_UP: "notifRankingUp",
    RANKING_DOWN: "notifRankingDown",
    BADGE_UNLOCKED: "notifBadgeUnlocked",
    STREAK_WARNING: "notifStreakWarning",
    SOMEONE_PASSED_YOU: "notifSomeonePassedYou",
    REMINDER_NO_PRONO: "notifReminderNoProno",
    DAILY_DIGEST: "dailyEmailEnabled", // Le digest est géré par email, pas notif web
  };

  return mapping[type] || null;
}

// ============================================
// HELPERS SPÉCIFIQUES PAR TYPE DE NOTIFICATION
// ============================================

/**
 * Créer une notification de match terminé
 */
export async function notifyGameFinished(params: {
  userId: string;
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
}) {
  const { userId, gameId, homeTeam, awayTeam, homeScore, awayScore } = params;

  return createNotification({
    userId,
    type: "GAME_FINISHED",
    title: "Match terminé",
    message: `${awayTeam} ${awayScore} - ${homeScore} ${homeTeam}`,
    link: "/pronos",
    metadata: { gameId, homeScore, awayScore },
  });
}

/**
 * Créer une notification de prono gagné
 */
export async function notifyPronoWon(params: {
  userId: string;
  gameId: string;
  predictionId: string;
  points: number;
  homeTeam: string;
  awayTeam: string;
}) {
  const { userId, gameId, predictionId, points, homeTeam, awayTeam } = params;

  return createNotification({
    userId,
    type: "PRONO_WON",
    title: "Prono gagné ! 🎉",
    message: `Tu as gagné ${points} points pour ${awayTeam} @ ${homeTeam}`,
    link: "/pronos",
    metadata: { gameId, predictionId, points },
  });
}

/**
 * Créer une notification de prono perdu
 */
export async function notifyPronoLost(params: {
  userId: string;
  gameId: string;
  predictionId: string;
  homeTeam: string;
  awayTeam: string;
}) {
  const { userId, gameId, predictionId, homeTeam, awayTeam } = params;

  return createNotification({
    userId,
    type: "PRONO_LOST",
    title: "Prono perdu",
    message: `Ton prono pour ${awayTeam} @ ${homeTeam} était incorrect`,
    link: "/pronos",
    metadata: { gameId, predictionId },
  });
}

/**
 * Créer une notification de progression au classement
 */
export async function notifyRankingUp(params: {
  userId: string;
  oldRank: number;
  newRank: number;
  placesGained: number;
}) {
  const { userId, oldRank, newRank, placesGained } = params;

  return createNotification({
    userId,
    type: "RANKING_UP",
    title: "Classement en hausse ! 📈",
    message: `Tu es passé de la ${oldRank}ème à la ${newRank}ème place (+${placesGained})`,
    link: "/classement",
    metadata: { oldRank, newRank, placesGained },
  });
}

/**
 * Créer une notification de demande d'ami
 */
export async function notifyFriendRequest(params: {
  userId: string;
  senderName: string;
  requestId: string;
}) {
  const { userId, senderName, requestId } = params;

  return createNotification({
    userId,
    type: "FRIEND_REQUEST",
    title: "Nouvelle demande d'ami",
    message: `${senderName} t'a envoyé une demande d'ami`,
    link: "/amis?tab=requests",
    metadata: { requestId },
  });
}

/**
 * Créer une notification d'invitation à une ligue
 */
export async function notifyLeagueInvitation(params: {
  userId: string;
  leagueName: string;
  leagueId: string;
  invitedBy: string;
}) {
  const { userId, leagueName, leagueId, invitedBy } = params;

  return createNotification({
    userId,
    type: "LEAGUE_INVITATION",
    title: "Invitation à une ligue",
    message: `${invitedBy} t'a invité à rejoindre "${leagueName}"`,
    link: `/ligues/${leagueId}`, // Future page
    metadata: { leagueId },
  });
}

/**
 * Créer une notification de badge débloqué
 */
export async function notifyBadgeUnlocked(params: {
  userId: string;
  badgeName: string;
  badgeId: string;
  badgeIcon?: string;
}) {
  const { userId, badgeName, badgeId, badgeIcon } = params;

  return createNotification({
    userId,
    type: "BADGE_UNLOCKED",
    title: "Nouveau badge débloqué ! 🏆",
    message: `Tu as débloqué le badge "${badgeName}"`,
    link: "/profile", // Ou page badges
    metadata: { badgeId, badgeIcon },
  });
}
