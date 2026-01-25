'use client';

import { useState } from 'react';
import { useCampaigns } from '@/lib/hooks';
import { useToast } from '@/contexts/ToastContext';

interface BarCampaignManagerProps {
  barId: string;
  barName?: string;
}

export default function BarCampaignManager({ barId, barName }: BarCampaignManagerProps) {
  const { getCampaignsForBar, createCampaign, toggleCampaignActive, deleteCampaign } = useCampaigns();
	  const { showToast } = useToast();
  const [text, setText] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const campaigns = getCampaignsForBar(barId);

  const handleAddCampaign = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

	    createCampaign(barId, trimmed, tags);
	    setText('');
	    setTagsInput('');
	    showToast({
	      title: 'Kampanje opprettet',
	      description: 'Den nye kampanjen er lagret og vises til gjestene.',
	      variant: 'success',
	    });
  };

	  const handleToggleActive = (campaignId: string, isActive: boolean) => {
	    toggleCampaignActive(campaignId);
	    showToast({
	      title: isActive ? 'Kampanje deaktivert' : 'Kampanje aktivert',
	      description: isActive
	        ? 'Kampanjen er skjult for gjestene dine.'
	        : 'Kampanjen er nå synlig i barprofilen.',
	      variant: 'info',
	    });
	  };

	  const handleDelete = (campaignId: string) => {
	    deleteCampaign(campaignId);
	    showToast({
	      title: 'Kampanje slettet',
	      description: 'Kampanjen er fjernet fra barprofilen.',
	      variant: 'info',
	    });
	  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
          Kampanjer & tilbud
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Lag kampanjer som vises i barprofilen til gjestene. For eksempel
	          &quot;Happy hour før kamp&quot; eller &quot;2-for-1 øl&quot;. Du kan legge til valgfrie tags
          for å strukturere tilbudene.
        </p>
      </div>

      {/* New campaign form */}
      <div className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-700 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Tekst
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="F.eks. Happy Hour før kamp fra 18–20, 2-for-1 på pizza ..."
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Tags (valgfritt)
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="happy hour, før kamp, 2-for-1"
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAddCampaign}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!text.trim()}
          >
            Legg til kampanje
          </button>
        </div>
      </div>

      {/* Campaign list */}
      <div className="space-y-3">
        {campaigns.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Ingen kampanjer enda. Opprett din første kampanje over.
          </p>
        ) : (
          campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                    {campaign.isActive ? 'Aktiv' : 'Inaktiv'}
                  </span>
                  {barName && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {barName}
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-900 dark:text-zinc-100 mb-1">
                  {campaign.text}
                </p>
                {campaign.tags && campaign.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {campaign.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
	                  onClick={() => handleToggleActive(campaign.id, campaign.isActive)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    campaign.isActive
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-600'
                  }`}
                >
                  {campaign.isActive ? 'Deaktiver' : 'Aktiver'}
                </button>
                <button
                  type="button"
	                  onClick={() => handleDelete(campaign.id)}
                  className="px-3 py-1 rounded-full text-xs font-medium border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
                >
                  Slett
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

