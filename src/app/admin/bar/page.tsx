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
    busy: data.busy,
    setBusy: data.setBusy,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Bar-panel</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Synlighet, betaling og barprofil.
        </p>
      </div>

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

      <BarStatusSection
        isVisible={data.bar?.isVisible}
        matchesNext7DaysCount={data.matchesNext7DaysCount}
        todayKey={data.todayKey}
      />

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

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <BarProfileForm
          profile={data.profile}
          location={data.location}
          busy={data.busy}
          autocomplete={profileHook.autocomplete}
          setAutocomplete={profileHook.setAutocomplete}
          updateProfileField={profileHook.updateProfileField}
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

