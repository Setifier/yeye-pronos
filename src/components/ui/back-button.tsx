"use client";

import { useRouter } from "next/navigation";

export function BackButton({ label = "Retour" }: { label?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors border border-zinc-800 hover:border-zinc-600 px-3 py-1.5 rounded-lg"
    >
      ← {label}
    </button>
  );
}
