"use client";

import { Eye, EyeOff } from "lucide-react";

interface NoSpoilToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function NoSpoilToggle({ enabled, onToggle }: NoSpoilToggleProps) {
  return (
    <div className="flex items-center gap-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-4 py-2.5">
      <div className="flex items-center gap-2">
        {enabled ? (
          <EyeOff className="w-4 h-4 text-[#ff5050]" />
        ) : (
          <Eye className="w-4 h-4 text-[#5096ff]" />
        )}
        <span className="text-sm font-medium text-zinc-300">
          {enabled ? "Mode No Spoil" : "Scores visibles"}
        </span>
      </div>

      <button
        onClick={() => onToggle(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? "bg-[#ff5050]" : "bg-zinc-600"
        }`}
        aria-label={enabled ? "Désactiver No Spoil" : "Activer No Spoil"}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
