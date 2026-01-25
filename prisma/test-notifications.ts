/**
 * Script de test pour créer des notifications de démonstration
 * Usage: npx tsx prisma/test-notifications.ts
 */

import { PrismaClient } from "@/generated/prisma";
import {
  notifyFriendRequest,
  notifyLeagueInvitation,
  notifyPronoWon,
  notifyPronoLost,
  notifyRankingUp,
  notifyBadgeUnlocked,
  createNotification,
} from "@/lib/notification-service";

const prisma = new PrismaClient();

async function main() {
  console.log("🧪 Création de notifications de test...\n");

  // Récupérer l'utilisateur par email
  const user = await prisma.user.findUnique({
    where: { email: "slim.etifier@gmail.com" },
  });

  if (!user) {
    console.error("❌ Aucun utilisateur trouvé en DB");
    console.log("   Crée un compte d'abord sur l'application\n");
    return;
  }

  console.log(`✅ Utilisateur trouvé: ${user.name} (${user.email})\n`);

  // 1. Notification sociale (activée par défaut)
  console.log("📧 Création de notification: Demande d'ami...");
  await notifyFriendRequest({
    userId: user.id,
    senderName: "Paul Dupont",
    requestId: "test-request-id",
  });

  // 2. Notification sociale (activée par défaut)
  console.log("🏆 Création de notification: Invitation ligue...");
  await notifyLeagueInvitation({
    userId: user.id,
    leagueName: "Ligue des Champions",
    leagueId: "test-league-id",
    invitedBy: "Marie Martin",
  });

  // 3. Notification rappel (activée par défaut)
  console.log("⏰ Création de notification: Rappel pronos...");
  await createNotification({
    userId: user.id,
    type: "REMINDER_NO_PRONO",
    title: "Tu n'as pas encore pronostiqué !",
    message: "3 matchs débutent dans 2 heures",
    link: "/matchs",
    metadata: { gamesCount: 3 },
  });

  // 4. Notification spoiler (désactivée par défaut)
  console.log("✅ Création de notification: Prono gagné (SPOILER)...");
  await notifyPronoWon({
    userId: user.id,
    gameId: "test-game-id",
    predictionId: "test-pred-id",
    points: 10,
    homeTeam: "Lakers",
    awayTeam: "Warriors",
  });

  // 5. Notification spoiler (désactivée par défaut)
  console.log("❌ Création de notification: Prono perdu (SPOILER)...");
  await notifyPronoLost({
    userId: user.id,
    gameId: "test-game-id-2",
    predictionId: "test-pred-id-2",
    homeTeam: "Celtics",
    awayTeam: "Heat",
  });

  // 6. Notification spoiler (désactivée par défaut)
  console.log("📈 Création de notification: Classement en hausse (SPOILER)...");
  await notifyRankingUp({
    userId: user.id,
    oldRank: 15,
    newRank: 12,
    placesGained: 3,
  });

  // 7. Notification spoiler (désactivée par défaut)
  console.log("🏅 Création de notification: Badge débloqué (SPOILER)...");
  await notifyBadgeUnlocked({
    userId: user.id,
    badgeName: "Série de 5",
    badgeId: "test-badge-id",
    badgeIcon: "🔥",
  });

  console.log("\n" + "=".repeat(60));
  console.log("✅ 7 notifications créées avec succès !");
  console.log("=".repeat(60) + "\n");

  // Afficher les stats
  const stats = await prisma.notification.groupBy({
    by: ["type"],
    where: {
      userId: user.id,
    },
    _count: {
      id: true,
    },
  });

  console.log("📊 Statistiques des notifications:");
  for (const stat of stats) {
    console.log(`   ${stat.type}: ${stat._count.id} notification(s)`);
  }

  console.log("\n📝 Instructions pour tester:");
  console.log("   1. Lance le serveur: npm run dev");
  console.log("   2. Connecte-toi avec: " + user.email);
  console.log("   3. Regarde la cloche 🔔 dans la navbar");
  console.log("   4. Va dans Paramètres pour activer les spoilers");
  console.log("   5. Recharge la page pour voir toutes les notifications\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
