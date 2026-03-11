'use client';

import { useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { BarService } from '@/lib/services';
import type { Bar, Position } from '@/lib/models';
import { useTranslation } from '@/lib/i18n';

const SHEET_DISMISS_THRESHOLD_PX = 120;
const SHEET_BACKDROP_FADE_DISTANCE_PX = 180;

export default function NearestBarListPanel(props: {
  bars: Bar[];
  userPosition: Position | null;
  onSelectBar: (bar: Bar) => void;
  onClose: () => void;
}) {
  const { bars, userPosition, onSelectBar, onClose } = props;
  const { t } = useTranslation();
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);

  const dragPointerIdRef = useRef<number | null>(null);
  const dragStartYRef = useRef(0);
  const dragOffsetYRef = useRef(0);

  const items = useMemo(() => {
    if (!userPosition) {
      return [...bars]
        .sort((a, b) => a.name.localeCompare(b.name, 'nb'))
        .map((bar) => ({ bar, distanceLabel: null }));
    }

    return BarService.sortBarsByDistance(bars, userPosition).map((bar) => {
      const km = BarService.calculateDistance(userPosition, bar.position);
      return { bar, distanceLabel: BarService.formatDistance(km) };
    });
  }, [bars, userPosition]);

  const handleSheetDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (dragPointerIdRef.current !== null) return;

    dragPointerIdRef.current = event.pointerId;
    dragStartYRef.current = event.clientY;
    dragOffsetYRef.current = 0;
    setIsDraggingSheet(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSheetDragMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return;

    const nextOffset = Math.max(0, event.clientY - dragStartYRef.current);
    dragOffsetYRef.current = nextOffset;
    setDragOffsetY(nextOffset);
  };

  const resetSheetDrag = () => {
    dragPointerIdRef.current = null;
    dragOffsetYRef.current = 0;
    setIsDraggingSheet(false);
    setDragOffsetY(0);
  };

  const handleSheetDragEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const shouldClose = dragOffsetYRef.current >= SHEET_DISMISS_THRESHOLD_PX;
    dragPointerIdRef.current = null;
    dragOffsetYRef.current = 0;
    setIsDraggingSheet(false);

    if (shouldClose) {
      onClose();
      return;
    }

    setDragOffsetY(0);
  };

  const handleSheetDragCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    resetSheetDrag();
  };

  const backdropOpacity = Math.max(0, 1 - dragOffsetY / SHEET_BACKDROP_FADE_DISTANCE_PX);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-200"
        style={{ opacity: backdropOpacity }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 flex max-h-[75vh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl transition-transform ease-out dark:bg-zinc-900 ${
          isDraggingSheet ? 'duration-0' : 'duration-300'
        }`}
        style={{ transform: `translateY(${dragOffsetY}px)` }}
      >
        {/* Handle bar */}
        <div
          className="flex cursor-grab touch-none select-none justify-center pt-3 pb-2 active:cursor-grabbing"
          onPointerDown={handleSheetDragStart}
          onPointerMove={handleSheetDragMove}
          onPointerUp={handleSheetDragEnd}
          onPointerCancel={handleSheetDragCancel}
        >
          <div className="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>

        <div className="min-h-0 overflow-y-auto px-6 pb-6">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t('nearest_bars_title')}</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {userPosition
                  ? t('nearest_sorted')
                  : t('nearest_enable_location')}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-950"
            >
              {t('close')}
            </button>
          </div>

          {items.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
              {t('nearest_no_bars')}
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
              {items.slice(0, 40).map(({ bar, distanceLabel }) => (
                <button
                  key={bar.id}
                  type="button"
                  onClick={() => onSelectBar(bar)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-zinc-900 dark:text-zinc-50">{bar.name}</div>
                    {bar.address ? (
                      <div className="truncate text-xs text-zinc-600 dark:text-zinc-400">{bar.address}</div>
                    ) : null}
                  </div>

                  <div className="shrink-0 text-sm text-zinc-700 dark:text-zinc-200">
                    {distanceLabel ?? '—'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
