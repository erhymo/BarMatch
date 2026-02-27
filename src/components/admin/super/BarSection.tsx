'use client';

import Link from 'next/link';
import { StatusPill } from '@/components/admin/StatusPill';
import type { useBarManagement } from '@/lib/admin/useBarManagement';
import type { BarRow, VisibilityFilter, BillingFilter, SortMode } from '@/lib/admin/useBarManagement';

type BarMgmt = ReturnType<typeof useBarManagement>;

interface BarSectionProps {
  mgmt: BarMgmt;
}

/* ---------- Small filter toggle ---------- */

type ToggleOption<T extends string> = { value: T; label: string };

function ToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ToggleOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-medium">{label}:</span>
      <div className="inline-flex rounded-full bg-zinc-100 p-1 dark:bg-zinc-900">
        {options.map((opt, i) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`${i > 0 ? 'ml-1 ' : ''}rounded-full px-2.5 py-1 text-xs font-medium ${
              value === opt.value
                ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
                : 'text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const visibilityOptions: ToggleOption<VisibilityFilter>[] = [
  { value: 'all', label: 'Alle' },
  { value: 'visible', label: 'Synlige' },
  { value: 'hidden', label: 'Skjulte' },
];

const billingOptions: ToggleOption<BillingFilter>[] = [
  { value: 'all', label: 'Alle' },
  { value: 'ok', label: 'OK' },
  { value: 'failed', label: 'Feilet' },
  { value: 'grace', label: 'I grace-periode' },
];

const sortOptions: ToggleOption<SortMode>[] = [
  { value: 'name', label: 'Navn' },
  { value: 'billing', label: 'Betaling' },
];

/* ---------- Bar action buttons ---------- */

function BarActions({ bar, mgmt }: { bar: BarRow; mgmt: BarMgmt }) {
  const isBusy = mgmt.busyActionId === bar.id || mgmt.busy;
  const isVisible = Boolean(bar.isVisible);
  const billingEnabled = Boolean(bar.billingEnabled);
  const btnCls = 'rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-900 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50';

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={isBusy} onClick={() => void mgmt.toggleVisibility(bar)} className={btnCls}>
        {isVisible ? 'Skjul' : 'Gjør synlig'}
      </button>
      <button
        type="button"
        disabled={isBusy}
        onClick={() => void (billingEnabled ? mgmt.billingOff(bar) : mgmt.billingOn(bar))}
        className={btnCls}
      >
        {billingEnabled ? 'Deaktiver betaling' : 'Aktiver betaling'}
      </button>
    </div>
  );
}

/* ---------- Main section ---------- */

export function BarSection({ mgmt }: BarSectionProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        {mgmt.barCountLabel}
      </div>

      {/* Filters */}
      <div className="border-b border-zinc-200 px-4 py-3 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        <div className="flex flex-wrap gap-3">
          <ToggleGroup label="Synlighet" options={visibilityOptions} value={mgmt.visibilityFilter} onChange={mgmt.setVisibilityFilter} />
          <ToggleGroup label="Betaling" options={billingOptions} value={mgmt.billingFilter} onChange={mgmt.setBillingFilter} />
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">Søk:</span>
            <input
              value={mgmt.searchTerm}
              onChange={(e) => mgmt.setSearchTerm(e.target.value)}
              placeholder="Navn, e-post eller ID"
              className="w-40 rounded-lg border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-800 dark:bg-zinc-900"
            />
          </div>
          <ToggleGroup label="Sorter" options={sortOptions} value={mgmt.sortMode} onChange={mgmt.setSortMode} />
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-900">
        {mgmt.filteredBars.map((b) => (
          <div key={b.id} className="px-4 py-4">
            <Link href={`/admin/super/bars/${b.id}`} className="font-medium text-zinc-900 hover:underline dark:text-zinc-50">
              {b.name ?? b.id}
            </Link>
            {b.email && <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{b.email}</div>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusPill kind="visibility" isVisible={b.isVisible} />
              <StatusPill kind="billing" billingEnabled={b.billingEnabled} billingStatus={b.billingStatus} gracePeriodEndsAt={b.stripe?.gracePeriodEndsAt} />
            </div>
            <div className="mt-4">
              <BarActions bar={b} mgmt={mgmt} />
            </div>
          </div>
        ))}
      </div>


      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-zinc-500 dark:text-zinc-400">
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="px-4 py-3 font-medium">Bar</th>
              <th className="px-4 py-3 font-medium">Synlighet</th>
              <th className="px-4 py-3 font-medium">Betaling</th>
              <th className="px-4 py-3 font-medium">Handling</th>
            </tr>
          </thead>
          <tbody>
            {mgmt.filteredBars.map((b) => (
              <tr key={b.id} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="px-4 py-3">
                  <Link href={`/admin/super/bars/${b.id}`} className="font-medium text-zinc-900 hover:underline dark:text-zinc-50">
                    {b.name ?? b.id}
                  </Link>
                  {b.email && <div className="text-xs text-zinc-500 dark:text-zinc-400">{b.email}</div>}
                </td>
                <td className="px-4 py-3">
                  <StatusPill kind="visibility" isVisible={b.isVisible} />
                </td>
                <td className="px-4 py-3">
                  <StatusPill kind="billing" billingEnabled={b.billingEnabled} billingStatus={b.billingStatus} gracePeriodEndsAt={b.stripe?.gracePeriodEndsAt} />
                </td>
                <td className="px-4 py-3">
                  <BarActions bar={b} mgmt={mgmt} />
                </td>
              </tr>
            ))}
            {mgmt.filteredBars.length === 0 && !mgmt.busy && (
              <tr>
                <td className="px-4 py-4 text-sm text-zinc-600 dark:text-zinc-400" colSpan={4}>
                  Ingen barer funnet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}