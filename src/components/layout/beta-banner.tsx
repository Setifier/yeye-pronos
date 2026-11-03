"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { BETA_BANNER_COOKIE } from "@/lib/beta";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Bandeau « version bêta » en haut des pages. Une fois fermé, il ne revient plus sur cet appareil. */
export function BetaBanner() {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  const close = () => {
    document.cookie = `${BETA_BANNER_COOKIE}=1; path=/; max-age=${ONE_YEAR}; SameSite=Lax`;
    setOpen(false);
  };

  return (
    <div className="border-b border-[#5096ff]/20 bg-[#5096ff]/10">
      <div className="max-w-7xl mx-auto flex items-center gap-3 px-4 sm:px-6 lg:px-8 py-2">
        <span className="shrink-0 rounded-md bg-[#5096ff] px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
          Bêta
        </span>
        <p className="flex-1 min-w-0 text-xs sm:text-sm text-zinc-300">
          Yeye Pronos est en version bêta
          <span className="hidden sm:inline"> : des bugs peuvent encore traîner, merci de les signaler</span>.
        </p>
        <button
          type="button"
          onClick={close}
          aria-label="Fermer le bandeau bêta"
          className="shrink-0 rounded-md p-1 text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
