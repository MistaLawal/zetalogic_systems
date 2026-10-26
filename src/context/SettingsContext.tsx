import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { announcement as defaultAnnouncement, company } from '../config/site';

// Public store settings, editable from the admin dashboard (Phase 5).
// The config file values are used until the database answers or if it can't.
export type Settings = {
  announcement: { enabled: boolean; text: string; link_label: string };
  business_hours: { days: string; time: string }[];
  socials: { instagram: string; linkedin: string; x: string; facebook: string };
  bank_transfer: { enabled: boolean; bank_name: string; account_name: string; account_number: string };
};

const defaults: Settings = {
  announcement: { enabled: defaultAnnouncement.enabled, text: defaultAnnouncement.text, link_label: defaultAnnouncement.linkLabel },
  business_hours: [...company.hours],
  socials: { ...company.socials },
  bank_transfer: { enabled: false, bank_name: '', account_name: '', account_number: '' },
};

const Ctx = createContext<Settings>(defaults);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaults);
  useEffect(() => {
    if (!supabase) return;
    supabase.from('store_settings').select('key, value').eq('is_public', true).then(({ data }) => {
      if (!data) return;
      const next = { ...defaults } as Record<string, unknown>;
      for (const row of data) if (row.key in defaults) next[row.key] = row.value;
      setSettings(next as Settings);
    });
  }, []);
  return <Ctx.Provider value={settings}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);
