"use client";

import { useEffect, useMemo, useRef } from "react";
import { CalendarDays, Eye, EyeOff } from "lucide-react";
import { FIRST_APP_SEASON, getCurrentSeason, getSeasonBounds } from "@/types/season";
import { formatNight, getCurrentNightDate, localDateToNightDate, nightDateToLocalDate, shiftNightDate } from "@/lib/game-night";

const MIN = getSeasonBounds(FIRST_APP_SEASON).start;
const MAX = getSeasonBounds(getCurrentSeason()).end;

/**
 * En-tête de la page Matchs sur mobile : titre, No Spoil, bande des nuits à faire défiler du doigt,
 * et le calendrier natif du téléphone pour sauter à n'importe quelle date.
 */
export function MobileNightPicker({ selectedDate, onDateChange, noSpoil, onToggleNoSpoil }: {
  selectedDate: Date;
  onDateChange: (d: Date) => void;
  noSpoil: boolean;
  onToggleNoSpoil: () => void;
}) {
  const selected = localDateToNightDate(selectedDate);
  const today = getCurrentNightDate();
  const stripRef = useRef<HTMLDivElement>(null);

  const days = useMemo(
    () => Array.from({ length: 15 }, (_, i) => shiftNightDate(selected, i - 7)).filter((d) => d >= MIN && d <= MAX),
    [selected]
  );

  // La nuit choisie reste au centre de la bande
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>(`[data-night="${selected}"]`);
    el?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [selected]);

  const pick = (night: string) => onDateChange(nightDateToLocalDate(night));

  return (
    <div className="pb-3 pt-3">
      <div className="flex items-center justify-between gap-2 px-4">
        <h1 className="text-2xl font-black tracking-tight text-white">Matchs</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleNoSpoil}
            className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-bold active:scale-95 transition-transform ${
              noSpoil ? "border-[#ff5050]/30 bg-[#ff5050]/10 text-[#ff5050]" : "border-zinc-800 bg-zinc-900 text-zinc-300"
            }`}
          >
            {noSpoil ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {noSpoil ? "No Spoil" : "Scores"}
          </button>
          <label className="relative flex h-9 w-9 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-300 active:scale-95 transition-transform">
            <CalendarDays className="h-4 w-4" />
            <span className="sr-only">Choisir une date</span>
            <input
              type="date"
              value={selected}
              min={MIN}
              max={MAX}
              onChange={(e) => { if (e.target.value) pick(e.target.value); }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
        </div>
      </div>

      <div
        ref={stripRef}
        className="mt-3 flex snap-x gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {days.map((night) => {
          const isSel = night === selected;
          const isToday = night === today;
          const rel = formatNight(night).relative;
          const d = new Date(`${night}T12:00:00Z`);
          const weekday = d.toLocaleDateString("fr-FR", { weekday: "short", timeZone: "UTC" }).replace(".", "");
          return (
            <button
              key={night}
              type="button"
              data-night={night}
              onClick={() => pick(night)}
              className={`flex w-14 flex-shrink-0 snap-center flex-col items-center rounded-2xl py-2 transition-all active:scale-95 ${
                isSel
                  ? "bg-[#5096ff] text-white shadow-lg shadow-[#5096ff]/25"
                  : isToday
                    ? "bg-zinc-900 text-[#dcff50] ring-1 ring-[#dcff50]/40"
                    : "bg-zinc-900 text-zinc-300"
              }`}
            >
              <span className={`text-[10px] font-bold uppercase ${isSel ? "text-white/80" : "opacity-70"}`}>
                {rel === "Ce soir" ? "Ce soir" : rel === "Hier soir" ? "Hier" : rel === "Demain soir" ? "Demain" : weekday}
              </span>
              <span className="text-lg font-black leading-tight">{d.getUTCDate()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
