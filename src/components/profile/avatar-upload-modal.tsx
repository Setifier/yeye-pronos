"use client";

import { useState, useRef } from "react";
import { Upload, Link as LinkIcon, X, Image as ImageIcon, Check } from "lucide-react";
import { toast } from "sonner";
import { updateUserImageAction } from "@/actions/update-user-image.action";
import { ImageCropEditor } from "./image-crop-editor";

interface AvatarUploadModalProps {
  currentImage: string | null;
  userName: string;
  onClose: () => void;
  onImageUpdated: (newImageUrl: string) => void;
}

export function AvatarUploadModal(props: AvatarUploadModalProps) {
  const { onClose, onImageUpdated } = props;
  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload");
  const [imageUrl, setImageUrl] = useState("");
  const [, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    if (!file.type.startsWith("image/")) {
      toast.error("Le fichier doit être une image");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB max
      toast.error("L'image ne doit pas dépasser 5 MB");
      return;
    }

    setUploadedFile(file);

    // Créer un aperçu et ouvrir l'éditeur
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
      setIsEditing(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedImg: string) => {
    setCroppedImage(croppedImg);
    setIsEditing(false);
  };

  const handleCancelCrop = () => {
    setIsEditing(false);
    setPreviewUrl(null);
    setUploadedFile(null);
    setCroppedImage(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    // Créer un faux événement pour réutiliser la validation
    const fakeEvent = {
      target: { files: [file] },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    handleFileChange(fakeEvent);
  };

  const handleSubmit = async () => {
    setIsUploading(true);

    try {
      let finalImageUrl = "";

      if (activeTab === "upload" && croppedImage) {
        // Utiliser l'image croppée (sera uploadée vers Cloudinary)
        finalImageUrl = croppedImage;
      } else if (activeTab === "url" && imageUrl) {
        finalImageUrl = imageUrl;
      } else {
        toast.error("Veuillez sélectionner une image");
        setIsUploading(false);
        return;
      }

      // Mettre à jour l'image via l'action
      const result = await updateUserImageAction(finalImageUrl);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Avatar mis à jour avec succès !");
        onImageUpdated(finalImageUrl);
        onClose();
      }
    } catch (error) {
      console.error("Error updating avatar:", error);
      toast.error("Erreur lors de la mise à jour de l'avatar");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-4 bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-xl font-semibold text-white">
            Changer l&apos;avatar
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "upload"
                ? "text-[#5096ff] border-b-2 border-[#5096ff]"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Upload className="inline h-4 w-4 mr-2" />
            Importer une image
          </button>
          <button
            onClick={() => setActiveTab("url")}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "url"
                ? "text-[#5096ff] border-b-2 border-[#5096ff]"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <LinkIcon className="inline h-4 w-4 mr-2" />
            URL d&apos;image
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === "upload" && (
            <div className="space-y-4">
              {isEditing && previewUrl ? (
                /* Éditeur de crop */
                <ImageCropEditor
                  image={previewUrl}
                  onCropComplete={handleCropComplete}
                  onCancel={handleCancelCrop}
                />
              ) : croppedImage ? (
                /* Aperçu de l'image croppée */
                <div className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center cursor-pointer hover:border-[#5096ff] hover:bg-zinc-800/50 transition-all"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <img
                      src={croppedImage}
                      alt="Aperçu"
                      className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-[#5096ff]"
                    />
                    <p className="text-sm text-zinc-400 mt-4">
                      Cliquez pour changer l&apos;image
                    </p>
                  </div>
                </div>
              ) : (
                /* Drop Zone */
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="relative border-2 border-dashed border-zinc-700 rounded-xl p-12 text-center cursor-pointer hover:border-[#5096ff] hover:bg-zinc-800/50 transition-all"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
                        <ImageIcon className="h-8 w-8 text-zinc-500" />
                      </div>
                    </div>
                    <div>
                      <p className="text-white font-medium mb-1">
                        Cliquez ou glissez une image ici
                      </p>
                      <p className="text-sm text-zinc-500">
                        PNG, JPG, GIF jusqu&apos;à 5 MB
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "url" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  URL de l&apos;image
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://exemple.com/avatar.jpg"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#5096ff] focus:border-transparent"
                />
              </div>

              {imageUrl && (
                <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <p className="text-sm text-zinc-400 mb-3">Aperçu :</p>
                  <img
                    src={imageUrl}
                    alt="Aperçu"
                    className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-zinc-700"
                    onError={() => toast.error("URL d\u0027image invalide")}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Masqué pendant l'édition */}
        {!isEditing && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-800">
            <button
              onClick={onClose}
              className="px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                isUploading ||
                (activeTab === "upload" && !croppedImage) ||
                (activeTab === "url" && !imageUrl)
              }
              className="px-6 py-2 bg-[#5096ff] hover:bg-[#5096ff]/90 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all"
            >
              {isUploading ? (
                <>
                  <svg
                    className="inline animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Mise à jour...
                </>
              ) : (
                <>
                  <Check className="inline h-4 w-4 mr-2" />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
