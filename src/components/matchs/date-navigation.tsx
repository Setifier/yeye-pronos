"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { FIRST_APP_SEASON, getCurrentSeason, getSeasonBounds } from "@/types/season";

interface DateNavigationProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

// Navigation : du début de la première saison suivie (archives) à la fin de la saison en cours
const NBA_SEASON_START = new Date(`${getSeasonBounds(FIRST_APP_SEASON).start}T00:00:00`);
const NBA_SEASON_END = new Date(`${getSeasonBounds(getCurrentSeason()).end}T23:59:59`);

export function DateNavigation({
  selectedDate,
  onDateChange,
}: DateNavigationProps) {
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date(selectedDate));
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Bloquer le scroll quand le modal est ouvert
  useEffect(() => {
    if (showMonthPicker) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showMonthPicker]);

  // Générer un tableau de 14 jours (7 avant, date sélectionnée, 6 après)
  const generateDates = () => {
    const dates = [];
    const baseDate = new Date(selectedDate);
    baseDate.setHours(0, 0, 0, 0);

    for (let i = -7; i <= 6; i++) {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const dates = generateDates();

  // Centrer le scroll sur la date sélectionnée quand elle change
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Trouver l'index de la date sélectionnée (devrait être au milieu, index 7)
    const selectedIndex = dates.findIndex(
      (date) => date.getTime() === selectedDate.getTime()
    );

    if (selectedIndex !== -1) {
      const button = container.children[selectedIndex] as HTMLElement;
      if (button) {
        button.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, [selectedDate]);

  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setShowLeftArrow(container.scrollLeft > 0);
    setShowRightArrow(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    );
  };

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", checkScroll);
      return () => container.removeEventListener("scroll", checkScroll);
    }
  }, []);

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 200;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date.getTime() === today.getTime();
  };

  const isSelected = (date: Date) => {
    return date.getTime() === selectedDate.getTime();
  };

  const formatDate = (date: Date) => {
    const day = date.toLocaleDateString("fr-FR", { weekday: "short" });
    const dayNum = date.getDate();
    const month = date.toLocaleDateString("fr-FR", { month: "short" });

    return { day, dayNum, month };
  };

  // Navigation jour précédent / suivant
  const goToPreviousDay = () => {
    const prevDay = new Date(selectedDate);
    prevDay.setDate(prevDay.getDate() - 1);
    if (prevDay >= NBA_SEASON_START) {
      onDateChange(prevDay);
    }
  };

  const goToNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    if (nextDay <= NBA_SEASON_END) {
      onDateChange(nextDay);
    }
  };

  // Générer le calendrier du mois sélectionné
  const generateMonthDays = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const days = [];

    // Jours du mois précédent (padding)
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    // Jours du mois
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      days.push(date);
    }

    return days;
  };

  const monthDays = generateMonthDays();

  const canGoPreviousMonth = () => {
    const prevMonth = new Date(selectedMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    return prevMonth >= NBA_SEASON_START;
  };

  const canGoNextMonth = () => {
    const nextMonth = new Date(selectedMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth <= NBA_SEASON_END;
  };

  const goToPreviousMonth = () => {
    if (canGoPreviousMonth()) {
      const prevMonth = new Date(selectedMonth);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      setSelectedMonth(prevMonth);
    }
  };

  const goToNextMonth = () => {
    if (canGoNextMonth()) {
      const nextMonth = new Date(selectedMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setSelectedMonth(nextMonth);
    }
  };

  return (
    <div className="relative">
      {/* Barre du haut : Flèches + Date actuelle + Bouton calendrier */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
        {/* Flèche gauche - Jour précédent */}
        <button
          onClick={goToPreviousDay}
          disabled={selectedDate <= NBA_SEASON_START}
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Jour précédent"
        >
          <ChevronLeft className="w-5 h-5 text-zinc-300" />
        </button>

        {/* Date actuelle + Bouton calendrier */}
        <button
          onClick={() => setShowMonthPicker(!showMonthPicker)}
          className="flex items-center gap-2 px-4 py-2 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <Calendar className="w-4 h-4 text-[#5096ff]" />
          <span className="text-sm font-medium text-zinc-300">
            {selectedDate.toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </button>

        {/* Flèche droite - Jour suivant */}
        <button
          onClick={goToNextDay}
          disabled={selectedDate >= NBA_SEASON_END}
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Jour suivant"
        >
          <ChevronRight className="w-5 h-5 text-zinc-300" />
        </button>
      </div>

      {/* Month Picker Modal avec Backdrop */}
      {showMonthPicker && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 animate-fadeIn"
            onClick={() => setShowMonthPicker(false)}
          />

          {/* Modal */}
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4 animate-slideUp">
            <div className="bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl p-6">
              {/* Header du calendrier */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={goToPreviousMonth}
                  disabled={!canGoPreviousMonth()}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5 text-zinc-300" />
                </button>
                <h3 className="text-lg font-semibold text-white capitalize">
                  {selectedMonth.toLocaleDateString("fr-FR", {
                    month: "long",
                    year: "numeric",
                  })}
                </h3>
                <button
                  onClick={goToNextMonth}
                  disabled={!canGoNextMonth()}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5 text-zinc-300" />
                </button>
              </div>

              {/* Jours de la semaine */}
              <div className="grid grid-cols-7 gap-3 mb-3">
                {["D", "L", "M", "M", "J", "V", "S"].map((day, i) => (
                  <div
                    key={i}
                    className="text-xs text-center text-zinc-500 font-semibold"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Grille des jours */}
              <div className="grid grid-cols-7 gap-2 mb-6">
                {monthDays.map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} />;
                  }

                  const isSelected =
                    day.toDateString() === selectedDate.toDateString();
                  const isToday =
                    day.toDateString() === new Date().toDateString();
                  const isOutOfSeason =
                    day < NBA_SEASON_START || day > NBA_SEASON_END;

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => {
                        onDateChange(day);
                        setShowMonthPicker(false);
                      }}
                      disabled={isOutOfSeason}
                      className={`
                        aspect-square rounded-lg text-sm font-semibold transition-all
                        ${
                          isSelected
                            ? "bg-[#ff5050] text-white shadow-lg scale-105"
                            : isToday
                            ? "bg-zinc-800 text-[#dcff50] ring-2 ring-[#dcff50]/30"
                            : isOutOfSeason
                            ? "text-zinc-700 cursor-not-allowed"
                            : "text-zinc-300 hover:bg-zinc-800 hover:scale-105"
                        }
                      `}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>

              {/* Bouton fermer */}
              <button
                onClick={() => setShowMonthPicker(false)}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-medium text-zinc-300 transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </>
      )}

      {/* Scroll horizontal des dates (existant) */}
      <div className="relative">
      {/* Left Arrow */}
      {showLeftArrow && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-gradient-to-r from-zinc-900 to-transparent pr-8 pl-2 h-full flex items-center"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-6 h-6 text-zinc-400 hover:text-white transition-colors" />
        </button>
      )}

      {/* Dates Container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {dates.map((date) => {
          const { day, dayNum, month } = formatDate(date);
          const selected = isSelected(date);
          const today = isToday(date);

          return (
            <button
              key={date.toISOString()}
              onClick={() => onDateChange(date)}
              className={`flex flex-col items-center justify-center min-w-[80px] px-4 py-3 rounded-lg transition-all ${
                selected
                  ? "bg-[#ff5050] text-white shadow-lg scale-105"
                  : today
                  ? "bg-zinc-800 text-[#dcff50] border border-[#dcff50]/30"
                  : "bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              <span className="text-xs font-medium uppercase opacity-80">
                {day}
              </span>
              <span className="text-2xl font-bold my-1">{dayNum}</span>
              <span className="text-xs uppercase opacity-80">{month}</span>
            </button>
          );
        })}
      </div>

      {/* Right Arrow */}
      {showRightArrow && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-gradient-to-l from-zinc-900 to-transparent pl-8 pr-2 h-full flex items-center"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-6 h-6 text-zinc-400 hover:text-white transition-colors" />
        </button>
      )}

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      </div>
    </div>
  );
}
