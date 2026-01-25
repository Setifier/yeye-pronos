import { v2 as cloudinary } from "cloudinary";

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload une image base64 vers Cloudinary et retourne l'URL
 * @param base64Image - Image au format base64 (avec ou sans préfixe data:image/...)
 * @param folder - Dossier Cloudinary où stocker l'image (par défaut: "nba-pronos/avatars")
 * @returns URL de l'image uploadée sur Cloudinary
 */
export async function uploadImageToCloudinary(
  base64Image: string,
  folder: string = "nba-pronos/avatars"
): Promise<string> {
  try {
    // Upload l'image vers Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(base64Image, {
      folder: folder,
      // Transformations automatiques pour optimiser l'image
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face" },
        { quality: "auto:good" },
        { fetch_format: "auto" }, // Conversion automatique vers le meilleur format (WebP si supporté)
      ],
      // Tags pour faciliter la gestion
      tags: ["avatar", "user-profile"],
    });

    // Retourner l'URL sécurisée
    return uploadResponse.secure_url;
  } catch (error) {
    console.error("Erreur lors de l'upload vers Cloudinary:", error);
    throw new Error("Impossible d'uploader l'image vers Cloudinary");
  }
}

/**
 * Supprime une image de Cloudinary
 * @param imageUrl - URL de l'image Cloudinary à supprimer
 */
export async function deleteImageFromCloudinary(
  imageUrl: string
): Promise<void> {
  try {
    // Extraire le public_id de l'URL Cloudinary
    // Format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{folder}/{public_id}.{format}
    const urlParts = imageUrl.split("/");
    const filename = urlParts[urlParts.length - 1];
    const publicId = filename.split(".")[0];

    // Récupérer le dossier (tout ce qui est entre "upload/" et le nom du fichier)
    const uploadIndex = urlParts.indexOf("upload");
    const folderParts = urlParts.slice(uploadIndex + 2, -1); // +2 pour skip "upload" et "v{version}"
    const folder = folderParts.join("/");

    const fullPublicId = folder ? `${folder}/${publicId}` : publicId;

    // Supprimer l'image
    await cloudinary.uploader.destroy(fullPublicId);
  } catch (error) {
    console.error("Erreur lors de la suppression de l'image:", error);
    // On ne throw pas l'erreur car ce n'est pas critique si la suppression échoue
  }
}

/**
 * Vérifie si une URL est une URL Cloudinary
 */
export function isCloudinaryUrl(url: string): boolean {
  return url.includes("res.cloudinary.com");
}

export { cloudinary };
