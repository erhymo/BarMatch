'use client';

import { useBarOwnerData } from '@/lib/admin/bar/useBarOwnerData';
import { useBarProfile } from '@/lib/admin/bar/useBarProfile';
import { BarCalendarSection } from '@/components/admin/bar/BarCalendarSection';
import { BarStatusSection } from '@/components/admin/bar/BarStatusSection';
import { BarInboxSection } from '@/components/admin/bar/BarInboxSection';
import { BarBillingSection } from '@/components/admin/bar/BarBillingSection';
import { BarProfileForm } from '@/components/admin/bar/BarProfileForm';
import { BarProfilePreview } from '@/components/admin/bar/BarProfilePreview';

export default function BarOwnerDashboard() {
  const data = useBarOwnerData();
  const profileHook = useBarProfile({
    user: data.user,
    barId: data.me?.barId,
    profile: data.profile,
    setProfile: data.setProfile,
    location: data.location,
    setLocation: data.setLocation,
    bar: data.bar,
    setBar: data.setBar,
    setBusy: data.setBusy,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      {/* ─── Page header with bar name + live status ─── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {data.bar?.name ?? 'Bar-panel'}
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Administrer kamper, synlighet og barprofil.
          </p>
        </div>
        {data.bar && (
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <span className="relative flex h-2.5 w-2.5">
              {data.bar.isVisible && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              )}
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${data.bar.isVisible ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
            </span>
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {data.bar.isVisible ? 'Synlig i appen' : 'Skjult'}
            </span>
          </div>
        )}
      </div>

      {/* ─── Calendar & fixtures ─── */}
      <BarCalendarSection
        calendarRangeDays={data.CALENDAR_RANGE_DAYS}
        fixturesError={data.fixturesError}
        isLoadingFixtures={data.isLoadingFixtures}
        hasAnyFixtures={data.fixtures.length > 0}
        hasSelectedFixturesInCalendar={data.selectedFixturesByDateKey.size > 0}
        calendarDays={data.calendarDays}
        selectedFixturesByDateKey={data.selectedFixturesByDateKey}
        todayKey={data.todayKey}
      />

      {/* ─── Status KPIs ─── */}
      <BarStatusSection
        isVisible={data.bar?.isVisible}
        matchesNext7DaysCount={data.matchesNext7DaysCount}
        todayKey={data.todayKey}
      />

      {/* ─── Inbox ─── */}
      <BarInboxSection
        barName={data.bar?.name}
        messages={data.messages}
        messagesLoading={data.messagesLoading}
        messagesError={data.messagesError}
        messagesOpen={data.messagesOpen}
        unreadMessages={data.unreadMessages}
        readMessages={data.readMessages}
        unreadMessageCount={data.unreadMessageCount}
        onToggle={data.handleToggleMessagesOpen}
      />

      {/* ─── Billing & visibility ─── */}
      <BarBillingSection
        bar={data.bar}
        busy={data.busy}
        paymentFailed={data.paymentFailed}
        graceDaysRemaining={data.graceDaysRemaining}
        graceActive={data.graceActive}
        graceExpired={data.graceExpired}
        hasStripeCustomerId={data.hasStripeCustomerId}
        visibilityBlockedReason={data.visibilityBlockedReason}
        onToggleVisible={data.toggleVisible}
        onUpdatePaymentCard={data.updatePaymentCard}
      />

      {/* ─── Profile editor + preview ─── */}
      <div className="grid gap-6 md:grid-cols-2">
        <BarProfileForm
          profile={data.profile}
          location={data.location}
          busy={data.busy}
          autocomplete={profileHook.autocomplete}
          addressCandidates={profileHook.addressCandidates}
          setAutocomplete={profileHook.setAutocomplete}
          updateProfileField={profileHook.updateProfileField}
          onApplyAddressCandidate={profileHook.applyAddressCandidate}
          onAutocompletePlaceChanged={profileHook.handleAutocompletePlaceChanged}
          onMarkerDragEnd={profileHook.handleMarkerDragEnd}
          onSave={profileHook.saveProfile}
        />

        <BarProfilePreview
          profile={data.profile}
          previewName={profileHook.previewName}
          previewAddress={profileHook.previewAddress}
          previewPhone={profileHook.previewPhone}
          previewScreensLabel={profileHook.previewScreensLabel}
          previewFoodLabel={profileHook.previewFoodLabel}
          previewFacilityBadges={profileHook.previewFacilityBadges}
          previewCapacityLabel={profileHook.previewCapacityLabel}
        />
      </div>
    </div>
  );
}

