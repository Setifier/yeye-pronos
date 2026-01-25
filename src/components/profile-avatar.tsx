"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import { AvatarUploadModal } from "./avatar-upload-modal";
import { useRouter } from "next/navigation";

interface ProfileAvatarProps {
  image: string | null;
  name: string;
}

export function ProfileAvatar({ image, name }: ProfileAvatarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState(image);
  const router = useRouter();

  const handleImageUpdated = (newImageUrl: string) => {
    setCurrentImage(newImageUrl);
    // Rafraîchir la page pour mettre à jour toutes les instances de l'avatar
    router.refresh();
  };

  return (
    <>
      <div className="flex-shrink-0 relative group">
        <button
          onClick={() => setIsModalOpen(true)}
          className="relative block"
        >
          {currentImage ? (
            <img
              src={currentImage}
              alt={name}
              className="w-24 h-24 rounded-2xl border-2 border-zinc-700 object-cover transition-all group-hover:border-[#5096ff]"
            />
          ) : (
            <div className="w-24 h-24 rounded-2xl border-2 border-zinc-700 bg-gradient-to-br from-[#5096ff] to-[#5096ff]/70 flex items-center justify-center transition-all group-hover:border-[#5096ff]">
              <span className="text-3xl font-bold text-white uppercase">
                {name.slice(0, 2)}
              </span>
            </div>
          )}

          {/* Overlay on hover */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="text-center">
              <Camera className="h-6 w-6 text-white mx-auto mb-1" />
              <span className="text-xs text-white font-medium">Changer</span>
            </div>
          </div>
        </button>
      </div>

      {isModalOpen && (
        <AvatarUploadModal
          currentImage={currentImage}
          userName={name}
          onClose={() => setIsModalOpen(false)}
          onImageUpdated={handleImageUpdated}
        />
      )}
    </>
  );
}
