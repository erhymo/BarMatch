'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useDemo } from '@/contexts/DemoContext';
import { dummyBars } from '@/lib/data/bars';
import { dummyMatches } from '@/lib/data/matches';
import { Bar } from '@/lib/models';
import MatchSelector from '@/components/admin/MatchSelector';
import BarMatchCalendar from '@/components/admin/BarMatchCalendar';
import BarChatManager from '@/components/admin/BarChatManager';
import BarCampaignManager from '@/components/admin/BarCampaignManager';

export default function AdminPage() {
  const router = useRouter();
	  const { isAuthenticated, logout, updateBar } = useAuth();
	  const { showToast } = useToast();
	  const { resetDemoData } = useDemo();
  const [bar, setBar] = useState<Bar | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBar, setEditedBar] = useState<Bar | null>(null);
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [cancelledMatchIds, setCancelledMatchIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Get bar data from localStorage
    const barId = localStorage.getItem('barId');
    if (barId) {
      const foundBar = dummyBars.find((b) => b.id === barId);
      if (foundBar) {
	        // eslint-disable-next-line react-hooks/set-state-in-effect
	        setBar(foundBar);
	        setEditedBar(foundBar);
        updateBar(foundBar);
	        setSelectedMatchIds(foundBar.matches?.map((m) => m.id) || []);

        // Load cancelled matches from localStorage
        const savedCancelledMatches = localStorage.getItem(`cancelledMatches_${barId}`);
        if (savedCancelledMatches) {
	          setCancelledMatchIds(JSON.parse(savedCancelledMatches));
        }
      }
    }
  }, [isAuthenticated, router, updateBar]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

		  const handleResetDemo = () => {
	    if (
	      window.confirm(
	        'Er du sikker pa at du vil resette alle demo-data? Favoritter, kampanjer, rating, chat og avlyste kamper blir satt tilbake til starttilstand.'
	      )
	    ) {
	      resetDemoData();
	    }
	  };

  const handleSaveMatches = () => {
    if (editedBar) {
      // Update matches based on selection
      const updatedMatches = dummyMatches.filter((m) =>
        selectedMatchIds.includes(m.id)
      );
      const updatedBar = { ...editedBar, matches: updatedMatches };

      setBar(updatedBar);
      updateBar(updatedBar);

      // In a real app, save to backend
      showToast({
        title: 'Kampvalg lagret',
        description: 'Kampoppsettet for baren er oppdatert.',
        variant: 'success',
      });
    }
  };

  const handleSaveProfile = () => {
    if (editedBar) {
      const updatedBar = { ...editedBar };
      setBar(updatedBar);
      updateBar(updatedBar);
      setIsEditing(false);

      showToast({
        title: 'Profil oppdatert',
        description: 'Endringene i barprofilen er lagret.',
        variant: 'success',
      });
    }
  };

  const handleCancelMatch = (matchId: string) => {
    const newCancelledIds = [...cancelledMatchIds, matchId];
    setCancelledMatchIds(newCancelledIds);

    // Save to localStorage
    if (bar) {
      localStorage.setItem(`cancelledMatches_${bar.id}`, JSON.stringify(newCancelledIds));
    }
  };

  if (!bar) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  		  return (
	    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                Admin Dashboard
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                Administrer {bar.name}
              </p>
	            </div>
	            <div className="flex items-center gap-3">
	              <button
	                onClick={handleResetDemo}
	                className="px-3 py-2 text-xs sm:text-sm border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
	              >
	                Reset demo-data
	              </button>
	              <button
	                onClick={handleLogout}
	                className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100
	                         hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
	              >
	                Logg ut
	              </button>
	            </div>
          </div>
        </div>
      </div>

	      <div className="container mx-auto px-4 py-8 pb-24 max-w-4xl">
        <div className="space-y-6">
          {/* Bar Profile Section */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                Barprofil
              </h2>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600
                         text-white rounded-lg transition-colors"
              >
                {isEditing ? 'Avbryt' : 'Rediger'}
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Navn
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedBar?.name || ''}
                    onChange={(e) =>
                      setEditedBar((prev) => prev ? { ...prev, name: e.target.value } : null)
                    }
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg
                             bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                  />
                ) : (
                  <p className="text-zinc-900 dark:text-zinc-100">{bar.name}</p>
                )}
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Adresse
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedBar?.address || ''}
                    onChange={(e) =>
                      setEditedBar((prev) => prev ? { ...prev, address: e.target.value } : null)
                    }
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg
                             bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                  />
                ) : (
                  <p className="text-zinc-900 dark:text-zinc-100">{bar.address}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Beskrivelse
                </label>
                {isEditing ? (
                  <textarea
                    value={editedBar?.description || ''}
                    onChange={(e) =>
                      setEditedBar((prev) => prev ? { ...prev, description: e.target.value } : null)
                    }
                    rows={3}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg
                             bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                  />
                ) : (
                  <p className="text-zinc-900 dark:text-zinc-100">{bar.description}</p>
                )}
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Rating
                </label>
                <p className="text-zinc-900 dark:text-zinc-100">
                  ⭐ {bar.rating?.toFixed(1) || 'Ingen rating'}
                </p>
              </div>

              {isEditing && (
                <button
                  onClick={handleSaveProfile}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600
                           text-white font-medium rounded-lg transition-colors"
                >
                  Lagre endringer
                </button>
              )}
            </div>
          </div>

          {/* Calendar Section */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                📅 Min Kalender
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Oversikt over alle kamper baren viser. Du kan avlyse kamper hvis nødvendig.
              </p>
            </div>

            <BarMatchCalendar
              matches={bar.matches || []}
              barId={bar.id}
              onCancelMatch={handleCancelMatch}
              cancelledMatchIds={cancelledMatchIds}
            />
          </div>

	          {/* Campaigns Section */}
	          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 p-6">
	            <BarCampaignManager barId={bar.id} barName={bar.name} />
	          </div>

          {/* Matches Section */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                Kampvalg
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Velg hvilke kamper baren din viser. Du kan filtrere etter liga eller lag, og velge alle kamper for et spesifikt lag.
              </p>
            </div>

            <MatchSelector
              selectedMatchIds={selectedMatchIds}
              onMatchSelectionChange={setSelectedMatchIds}
            />

            <button
              onClick={handleSaveMatches}
              className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600
                       text-white font-medium rounded-lg transition-colors"
            >
              Lagre kampvalg
            </button>
          </div>

          {/* Chat Manager */}
          <div className="mt-8">
            <BarChatManager barId={bar.id} barName={bar.name} />
          </div>
        </div>
      </div>
    </div>
  );
}

