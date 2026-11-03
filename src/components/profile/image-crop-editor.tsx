"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { ZoomIn, ZoomOut } from "lucide-react";
import type { Area } from "react-easy-crop";

interface ImageCropEditorProps {
  image: string;
  onCropComplete: (croppedImage: string) => void;
  onCancel: () => void;
}

// Fonction utilitaire pour créer l'image croppée
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  // Taille maximale pour un avatar (optimisé pour éviter les images trop lourdes)
  const MAX_SIZE = 400;

  // Calculer les dimensions finales (max 400x400)
  let finalWidth = pixelCrop.width;
  let finalHeight = pixelCrop.height;

  if (finalWidth > MAX_SIZE || finalHeight > MAX_SIZE) {
    const ratio = Math.min(MAX_SIZE / finalWidth, MAX_SIZE / finalHeight);
    finalWidth = Math.round(finalWidth * ratio);
    finalHeight = Math.round(finalHeight * ratio);
  }

  // Définir la taille du canvas (image finale optimisée)
  canvas.width = finalWidth;
  canvas.height = finalHeight;

  // Dessiner l'image croppée et redimensionnée
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    finalWidth,
    finalHeight
  );

  // Retourner en base64 avec compression optimisée
  // Qualité 0.85 = bon compromis entre qualité et taille
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function ImageCropEditor({
  image,
  onCropComplete,
  onCancel,
}: ImageCropEditorProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const onCropChange = (location: { x: number; y: number }) => {
    setCrop(location);
  };

  const onCropAreaChange = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleSave = async () => {
    if (!croppedAreaPixels) return;

    setIsSaving(true);
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      onCropComplete(croppedImage);
    } catch (error) {
      console.error("Error cropping image:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cropper Area */}
      <div className="relative w-full h-[400px] bg-zinc-950 rounded-lg overflow-hidden">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={onCropChange}
          onZoomChange={setZoom}
          onCropAreaChange={onCropAreaChange}
          style={{
            containerStyle: {
              backgroundColor: "#09090b",
            },
            cropAreaStyle: {
              border: "2px solid #5096ff",
            },
          }}
        />
      </div>

      {/* Info & Zoom Control */}
      <div className="space-y-3">
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-xs text-blue-400">
            💡 L&apos;image sera automatiquement optimisée et stockée sur Cloudinary (max 400x400, format WebP)
          </p>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-zinc-300">Zoom</label>
          <span className="text-sm text-zinc-500">{Math.round(zoom * 100)}%</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setZoom(Math.max(1, zoom - 0.1))}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #5096ff 0%, #5096ff ${
                ((zoom - 1) / 2) * 100
              }%, #27272a ${((zoom - 1) / 2) * 100}%, #27272a 100%)`,
            }}
          />
          <button
            onClick={() => setZoom(Math.min(3, zoom + 0.1))}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-zinc-500 text-center">
          Utilisez la molette de la souris ou pincez pour zoomer
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Annuler
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-[#5096ff] hover:bg-[#5096ff]/90 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all"
        >
          {isSaving ? (
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
              Recadrage...
            </>
          ) : (
            "Valider"
          )}
        </button>
      </div>
    </div>
  );
}
