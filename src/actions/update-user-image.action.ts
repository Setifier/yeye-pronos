"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  uploadImageToCloudinary,
  deleteImageFromCloudinary,
  isCloudinaryUrl,
} from "@/lib/cloudinary";

export async function updateUserImageAction(imageUrl: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { error: "Non authentifié" };
    }

    // Récupérer l'utilisateur avec son image actuelle
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    });

    let finalImageUrl = imageUrl;

    // Si l'image n'est pas déjà une URL Cloudinary, l'uploader
    if (!isCloudinaryUrl(imageUrl)) {
      // Uploader vers Cloudinary (que ce soit base64 ou URL externe)
      finalImageUrl = await uploadImageToCloudinary(imageUrl);
    }

    // Supprimer l'ancienne image de Cloudinary si elle existe
    if (user?.image && isCloudinaryUrl(user.image)) {
      // On ne bloque pas si la suppression échoue
      await deleteImageFromCloudinary(user.image).catch((error) =>
        console.warn("Impossible de supprimer l'ancienne image:", error)
      );
    }

    // Mettre à jour l'image de l'utilisateur avec l'URL Cloudinary
    await auth.api.updateUser({
      headers: await headers(),
      body: {
        image: finalImageUrl,
      },
    });

    return { error: null, imageUrl: finalImageUrl };
  } catch (error) {
    console.error("Error updating user image:", error);
    return { error: "Erreur lors de la mise à jour de l'avatar" };
  }
}
