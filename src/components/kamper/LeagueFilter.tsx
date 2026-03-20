"use client";

import { useState } from "react";
import { MatchService } from "@/lib/services";
import type { LeagueKey } from "@/lib/types/fixtures";
import { COMPETITIONS } from "@/lib/config/competitions";
import { useTranslation } from '@/lib/i18n';

const LEAGUES: { key: LeagueKey; label: string }[] = COMPETITIONS.map(({ key, label }) => ({ key, label }));

interface LeagueFilterProps {
  selectedLeague: LeagueKey | "";
  onSelectLeague: (league: LeagueKey | "") => void;
}

export default function LeagueFilter({ selectedLeague, onSelectLeague }: LeagueFilterProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const selectedLabel = selectedLeague
    ? LEAGUES.find((l) => l.key === selectedLeague)?.label
    : null;

  function handleSelect(key: LeagueKey) {
    if (selectedLeague === key) {
      onSelectLeague("");
    } else {
      onSelectLeague(key);
    }
    setIsOpen(false);
  }

  return (
    <div>
      {/* Accordion header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-3 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">⚽</span>
          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            {t('league_football')}
          </span>
          {selectedLabel && (
            <span className="ml-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
              — {selectedLabel}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-zinc-500 dark:text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Accordion body */}
      {isOpen && (
        <div className="mt-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
          {LEAGUES.map(({ key, label }) => {
            const isSelected = selectedLeague === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelect(key)}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors border-b last:border-b-0 border-zinc-100 dark:border-zinc-800 ${
                  isSelected
                    ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold"
                    : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                <span className="text-base">{MatchService.getLeagueEmoji(label)}</span>
                <span>{label}</span>
                {isSelected && (
                  <span className="ml-auto text-blue-500 dark:text-blue-400">✓</span>
                )}
              </button>
            );
          })}

          {selectedLeague && (
            <button
              type="button"
              onClick={() => { onSelectLeague(""); setIsOpen(false); }}
              className="w-full px-4 py-2 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-center"
            >
              {t('league_show_all')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

