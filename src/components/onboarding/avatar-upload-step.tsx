"use client";

import { useState, useRef } from "react";
import { Upload, ChevronLeft, User, X, AlertTriangle } from "lucide-react";
import { updateUserImageAction } from "@/actions/update-user-image.action";
import { ImageCropEditor } from "@/components/image-crop-editor";

interface AvatarUploadStepProps {
  userId: string;
  currentAvatarUrl?: string;
  onAvatarChange: (url?: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

/**
 * Étape 4: Upload d'avatar (optionnel)
 *
 * Permet d'uploader une image de profil via Cloudinary avec crop et redimensionnement
 * Boutons: "Passer" (skip) ou "Terminer" (submit)
 */
export function AvatarUploadStep({
  userId,
  currentAvatarUrl,
  onAvatarChange,
  onSubmit,
  onBack,
  isSubmitting,
}: AvatarUploadStepProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadError("Veuillez sélectionner une image valide");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("L'image ne doit pas dépasser 5 MB");
      return;
    }

    setUploadError(null);

    // Create preview and open editor
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
      setIsEditing(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedImg: string) => {
    setCroppedImage(croppedImg);
    setIsEditing(false);

    // Automatically upload the cropped image
    setIsUploading(true);
    setUploadError(null);

    try {
      const result = await updateUserImageAction(croppedImg);

      if (result.error) {
        setUploadError(result.error);
        setCroppedImage(null);
      } else if (result.imageUrl) {
        onAvatarChange(result.imageUrl);
      }
    } catch (error) {
      setUploadError("Erreur lors de l'upload de l'image");
      setCroppedImage(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleCancelCrop = () => {
    setIsEditing(false);
    setPreviewUrl(null);
    setCroppedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = () => {
    onAvatarChange(undefined);
    setCroppedImage(null);
  };

  const handleSkip = () => {
    onAvatarChange(undefined);
    onSubmit();
  };

  // Show crop editor if editing
  if (isEditing && previewUrl) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-white mb-2">
            Ajustez votre photo
          </h2>
          <p className="text-zinc-400">
            Déplacez et zoomez pour ajuster votre photo de profil
          </p>
        </div>
        <ImageCropEditor
          image={previewUrl}
          onCropComplete={handleCropComplete}
          onCancel={handleCancelCrop}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
          <Upload className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Ajoutez une photo de profil
        </h2>
        <p className="text-zinc-400">
          Cette étape est optionnelle. Vous pourrez ajouter une photo plus tard.
        </p>
      </div>

      {/* Avatar Preview / Upload Area */}
      <div className="flex flex-col items-center gap-6">
        {/* Current Avatar or Placeholder */}
        <div className="relative">
          {currentAvatarUrl ? (
            <div className="relative">
              <img
                src={currentAvatarUrl}
                alt="Avatar"
                className="w-32 h-32 rounded-full object-cover border-4 border-zinc-700"
              />
              <button
                onClick={handleRemoveAvatar}
                className="absolute -top-2 -right-2 p-2 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-4 border-zinc-700">
              <User className="w-16 h-16 text-white" />
            </div>
          )}
        </div>

        {/* Upload Button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Upload en cours...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              {currentAvatarUrl ? "Changer l'avatar" : "Choisir une image"}
            </>
          )}
        </button>

        {/* Upload Error */}
        {uploadError && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 rounded-xl p-3 text-sm text-center">
            {uploadError}
          </div>
        )}
      </div>

      {/* Content Policy Warning */}
      <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-xl p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-yellow-200 font-semibold text-sm mb-1">
            Politique de contenu
          </p>
          <p className="text-yellow-200/80 text-sm">
            Veuillez utiliser une photo appropriée. Les contenus inappropriés,
            offensants ou violant les droits d'autrui sont interdits et
            pourront entraîner la suspension de votre compte.
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
        <p className="text-sm text-zinc-400">
          💡 Format accepté: JPG, PNG, GIF (max 5 MB)
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
          Retour
        </button>

        {/* Skip Button */}
        {!currentAvatarUrl && (
          <button
            onClick={handleSkip}
            disabled={isSubmitting}
            className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Finalisation..." : "Passer"}
          </button>
        )}

        {/* Complete Button */}
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className={`flex-1 py-4 rounded-xl font-semibold transition-all ${
            isSubmitting
              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl"
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Finalisation...
            </span>
          ) : (
            "Terminer"
          )}
        </button>
      </div>
    </div>
  );
}
