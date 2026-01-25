import { prisma } from "@/lib/prisma";

/**
 * Génère un code ami unique au format #A7K3M (5 caractères alphanumériques en majuscules)
 *
 * Le code est préfixé par # et contient 5 caractères aléatoires parmi:
 * - Lettres: A-Z (majuscules uniquement)
 * - Chiffres: 0-9
 *
 * Avec 36^5 = 60,466,176 combinaisons possibles, on a largement assez pour éviter les collisions
 */
export async function generateUniqueFriendCode(): Promise<string> {
  const CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const CODE_LENGTH = 5;
  const MAX_ATTEMPTS = 10;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // Générer un code aléatoire
    let code = "#";
    for (let i = 0; i < CODE_LENGTH; i++) {
      const randomIndex = Math.floor(Math.random() * CHARACTERS.length);
      code += CHARACTERS[randomIndex];
    }

    // Vérifier l'unicité
    const existingUser = await prisma.user.findUnique({
      where: { friendCode: code },
      select: { id: true },
    });

    if (!existingUser) {
      return code;
    }

    // Si collision, on réessaie
    console.warn(`[FriendCode] Collision détectée pour ${code}, tentative ${attempt + 1}/${MAX_ATTEMPTS}`);
  }

  // Si après MAX_ATTEMPTS on a toujours des collisions, on throw une erreur
  throw new Error("Impossible de générer un friendCode unique après plusieurs tentatives");
}
