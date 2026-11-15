"use client";

import { useState } from "react";

/** Photo d'un lauréat (ESPN) ; initiales si l'image ne charge pas ou n'existe pas (entraîneur). */
export function AwardHeadshot({ name, src, size }: { name: string; src: string | null; size: number }) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  if (!src || failed) {
    return (
      <span
        className="flex flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 font-bold text-zinc-300"
        style={{ width: size, height: size, fontSize: Math.round(size / 2.8) }}
      >
        {initials}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      onError={() => setFailed(true)}
      className="flex-shrink-0 rounded-full bg-zinc-800 object-cover object-top"
      style={{ width: size, height: size }}
    />
  );
}
