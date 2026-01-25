/**
 * Templates d'emails pour le système de notifications
 */

interface DailyDigestData {
  userName: string;
  missingPredictions?: {
    count: number;
    games: Array<{
      homeTeam: string;
      awayTeam: string;
      time: string;
    }>;
  };
  yesterdayResults?: {
    won: number;
    lost: number;
    totalPoints: number;
    games: Array<{
      homeTeam: string;
      awayTeam: string;
      homeScore: number;
      awayScore: number;
      prediction: string;
      result: "WON" | "LOST";
    }>;
  };
  rankingChange?: {
    oldRank: number;
    newRank: number;
    totalPoints: number;
    winRate: number;
  };
  achievements?: Array<{
    badgeName: string;
    badgeIcon: string;
  }>;
}

/**
 * Template pour le digest quotidien
 * Avec bouton "Révéler les résultats" pour anti-spoil
 */
export function generateDailyDigestEmail(data: DailyDigestData): string {
  const {
    userName,
    missingPredictions,
    yesterdayResults,
    rankingChange,
    achievements,
  } = data;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ton récap quotidien - Yeye Pronos</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #09090b;
      color: #ffffff;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #18181b;
    }
    .header {
      background: linear-gradient(to bottom, #27272a, #18181b);
      padding: 40px 20px;
      text-align: center;
      border-bottom: 1px solid #3f3f46;
    }
    .logo {
      height: 60px;
      margin-bottom: 20px;
    }
    .title {
      font-size: 28px;
      font-weight: bold;
      background: linear-gradient(to right, #ff5050, #5096ff, #dcff50);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin: 0;
    }
    .subtitle {
      color: #a1a1aa;
      font-size: 16px;
      margin-top: 10px;
    }
    .content {
      padding: 30px 20px;
    }
    .section {
      background-color: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .section-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 15px;
    }
    .section-icon {
      font-size: 24px;
    }
    .section-title {
      font-size: 18px;
      font-weight: bold;
      color: #ffffff;
      margin: 0;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background: linear-gradient(to right, #5096ff, rgba(80, 150, 255, 0.8));
      color: #ffffff;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      transition: all 0.3s;
    }
    .button:hover {
      background: linear-gradient(to right, rgba(80, 150, 255, 0.9), rgba(80, 150, 255, 0.7));
    }
    .warning-box {
      background-color: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
    }
    .warning-text {
      color: #fca5a5;
      font-size: 14px;
      margin: 0;
    }
    .game-list {
      margin-top: 15px;
    }
    .game-item {
      background-color: #3f3f46;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .game-teams {
      font-size: 14px;
      font-weight: 600;
      color: #ffffff;
    }
    .game-time {
      font-size: 12px;
      color: #a1a1aa;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-top: 15px;
    }
    .stat-box {
      background-color: #3f3f46;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    .stat-label {
      font-size: 12px;
      color: #a1a1aa;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #ffffff;
    }
    .footer {
      background-color: #27272a;
      padding: 30px 20px;
      text-align: center;
      border-top: 1px solid #3f3f46;
    }
    .footer-text {
      color: #71717a;
      font-size: 12px;
      margin: 5px 0;
    }
    .footer-link {
      color: #5096ff;
      text-decoration: none;
    }
    .reveal-content {
      display: none;
    }
    .center {
      text-align: center;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <img src="${baseUrl}/logo.png" alt="Yeye Pronos" class="logo">
      <h1 class="title">Ton Récap Quotidien</h1>
      <p class="subtitle">Bonjour ${userName} 👋</p>
    </div>

    <!-- Content -->
    <div class="content">
      ${
        missingPredictions && missingPredictions.count > 0
          ? `
      <!-- Pronos Manquants -->
      <div class="section">
        <div class="section-header">
          <span class="section-icon">⚠️</span>
          <h2 class="section-title">Tu n'as pas encore pronostiqué !</h2>
        </div>
        <p style="color: #a1a1aa; margin-bottom: 15px;">
          ${missingPredictions.count} match${missingPredictions.count > 1 ? "s" : ""} ${missingPredictions.count > 1 ? "t'attendent" : "t'attend"} aujourd'hui :
        </p>
        <div class="game-list">
          ${missingPredictions.games
            .map(
              (game) => `
          <div class="game-item">
            <div>
              <div class="game-teams">${game.awayTeam} @ ${game.homeTeam}</div>
            </div>
            <div class="game-time">${game.time}</div>
          </div>
          `
            )
            .join("")}
        </div>
        <div class="center" style="margin-top: 20px;">
          <a href="${baseUrl}/matchs" class="button">Faire mes pronos →</a>
        </div>
      </div>
      `
          : ""
      }

      ${
        yesterdayResults || rankingChange || (achievements && achievements.length > 0)
          ? `
      <!-- Bouton Anti-Spoil -->
      <div class="warning-box">
        <p class="warning-text">
          ⚠️ <strong>Attention aux spoilers !</strong> Les résultats d'hier et ton évolution sont cachés.
          Clique sur le bouton ci-dessous pour les révéler.
        </p>
      </div>

      <div class="center">
        <a href="${baseUrl}/pronos" class="button">
          🔓 Révéler les résultats
        </a>
      </div>

      <!-- Contenu Spoiler (masqué par défaut) -->
      <div class="reveal-content">
        ${
          yesterdayResults
            ? `
        <!-- Résultats d'hier -->
        <div class="section">
          <div class="section-header">
            <span class="section-icon">📊</span>
            <h2 class="section-title">Tes résultats d'hier</h2>
          </div>
          <div class="stats-grid">
            <div class="stat-box" style="background-color: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3);">
              <div class="stat-label" style="color: #86efac;">Gagnés</div>
              <div class="stat-value" style="color: #22c55e;">${yesterdayResults.won}</div>
            </div>
            <div class="stat-box" style="background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3);">
              <div class="stat-label" style="color: #fca5a5;">Perdus</div>
              <div class="stat-value" style="color: #ef4444;">${yesterdayResults.lost}</div>
            </div>
          </div>
          <div style="text-align: center; margin-top: 15px;">
            <p style="color: #a1a1aa; font-size: 14px;">
              <strong style="color: #5096ff; font-size: 18px;">+${yesterdayResults.totalPoints} points</strong> gagnés hier
            </p>
          </div>
        </div>
        `
            : ""
        }

        ${
          rankingChange
            ? `
        <!-- Évolution Classement -->
        <div class="section">
          <div class="section-header">
            <span class="section-icon">📈</span>
            <h2 class="section-title">Évolution du Classement</h2>
          </div>
          <div style="text-align: center; margin: 20px 0;">
            ${
              rankingChange.newRank < rankingChange.oldRank
                ? `
            <p style="color: #22c55e; font-size: 18px; font-weight: bold; margin: 0;">
              Tu es passé de la ${rankingChange.oldRank}ème à la ${rankingChange.newRank}ème place 🎉
            </p>
            <p style="color: #86efac; font-size: 14px; margin-top: 5px;">
              +${rankingChange.oldRank - rankingChange.newRank} place${rankingChange.oldRank - rankingChange.newRank > 1 ? "s" : ""}
            </p>
            `
                : rankingChange.newRank > rankingChange.oldRank
                ? `
            <p style="color: #ef4444; font-size: 18px; font-weight: bold; margin: 0;">
              Tu es passé de la ${rankingChange.oldRank}ème à la ${rankingChange.newRank}ème place
            </p>
            <p style="color: #fca5a5; font-size: 14px; margin-top: 5px;">
              -${rankingChange.newRank - rankingChange.oldRank} place${rankingChange.newRank - rankingChange.oldRank > 1 ? "s" : ""}
            </p>
            `
                : `
            <p style="color: #a1a1aa; font-size: 18px; font-weight: bold; margin: 0;">
              Tu es resté à la ${rankingChange.oldRank}ème place
            </p>
            `
            }
          </div>
          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-label">Total Points</div>
              <div class="stat-value">${rankingChange.totalPoints}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Win Rate</div>
              <div class="stat-value">${rankingChange.winRate}%</div>
            </div>
          </div>
        </div>
        `
            : ""
        }

        ${
          achievements && achievements.length > 0
            ? `
        <!-- Nouveaux Badges -->
        <div class="section">
          <div class="section-header">
            <span class="section-icon">🏆</span>
            <h2 class="section-title">Nouveaux Badges Débloqués !</h2>
          </div>
          <div style="margin-top: 15px;">
            ${achievements
              .map(
                (badge) => `
            <div class="game-item" style="justify-content: flex-start; gap: 15px;">
              <span style="font-size: 32px;">${badge.badgeIcon}</span>
              <div>
                <div class="game-teams">${badge.badgeName}</div>
                <div class="game-time">Badge débloqué !</div>
              </div>
            </div>
            `
              )
              .join("")}
          </div>
        </div>
        `
            : ""
        }
      </div>
      `
          : ""
      }
    </div>

    <!-- Footer -->
    <div class="footer">
      <p class="footer-text">
        🤖 Généré avec <a href="${baseUrl}" class="footer-link">Yeye Pronos</a>
      </p>
      <p class="footer-text">
        <a href="${baseUrl}/parametres" class="footer-link">Gérer mes préférences</a>
      </p>
      <p class="footer-text" style="margin-top: 15px;">
        Tu ne veux plus recevoir ces emails ?
        <a href="${baseUrl}/parametres" class="footer-link">Se désabonner</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Générer l'email de bienvenue
 */
export function generateWelcomeEmail(userName: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue sur Yeye Pronos !</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #09090b;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #18181b; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${baseUrl}/logo.png" alt="Yeye Pronos" style="height: 80px;">
      <h1 style="background: linear-gradient(to right, #ff5050, #5096ff, #dcff50); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 32px; margin: 20px 0;">
        Bienvenue ${userName} ! 🎉
      </h1>
    </div>

    <div style="background-color: #27272a; border: 1px solid #3f3f46; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
      <p style="color: #ffffff; font-size: 16px; line-height: 1.6;">
        Merci de rejoindre <strong>Yeye Pronos</strong> ! 🏀
      </p>
      <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6;">
        Tu peux maintenant pronostiquer sur tous les matchs NBA et gravir le classement !
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${baseUrl}/matchs" style="display: inline-block; padding: 14px 28px; background: linear-gradient(to right, #5096ff, rgba(80, 150, 255, 0.8)); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Faire mon premier prono →
        </a>
      </div>
    </div>

    <div style="text-align: center; color: #71717a; font-size: 12px;">
      <p>Des questions ? <a href="${baseUrl}" style="color: #5096ff; text-decoration: none;">Contacte-nous</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
