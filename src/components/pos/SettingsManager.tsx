import React, { useState } from 'react';
import { StoreSettings } from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
import { Settings, Save, CheckCircle2, RotateCcw, Building, Clock, Percent } from 'lucide-react';
import { SEED_SETTINGS } from '../../data/seedData';

interface SettingsManagerProps {
  settings: StoreSettings;
  onUpdateSettings: (newSettings: StoreSettings) => void;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const { showConfirm, showAlert } = useModal();
  const [form, setForm] = useState<StoreSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    AppStore.saveSettings(form);
    onUpdateSettings(form);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetDefaults = async () => {
    const ok = await showConfirm({
      title: 'Reset Store Settings?',
      message: 'Are you sure you want to reset all store configuration back to initial Yellow Hauz defaults?',
      type: 'warning',
      confirmText: 'Reset to Defaults',
      cancelText: 'Keep Current',
    });
    if (ok) {
      AppStore.saveSettings(SEED_SETTINGS);
      setForm(SEED_SETTINGS);
      onUpdateSettings(SEED_SETTINGS);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      showAlert({
        title: 'Settings Reset',
        message: 'Store settings have been restored to initial defaults.',
        type: 'success',
      });
    }
  };

  return (
    <div className="max-w-4xl space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-amber-700">
            System Administration
          </span>
          <h2 className="font-display text-2xl font-extrabold text-stone-900">
            Store &amp; POS Settings
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Configure business information, tax percentages, and receipt print details.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetDefaults}
          className="flex items-center gap-1.5 rounded-xl border border-stone-200 px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Defaults
        </button>
      </div>

      {savedSuccess && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 animate-in fade-in duration-150">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          Settings successfully updated and applied across all terminals!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
          <h3 className="font-display text-base font-bold text-stone-900 flex items-center gap-2 border-b border-stone-100 pb-3">
            <Building className="h-4 w-4 text-amber-600" />
            <span>Store Profile &amp; Contact</span>
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Shop Name
              </label>
              <input
                type="text"
                required
                value={form.shop_name}
                onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
                className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                required
                value={form.shop_phone}
                onChange={(e) => setForm({ ...form, shop_phone: e.target.value })}
                className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
              Store Address
            </label>
            <input
              type="text"
              required
              value={form.shop_address}
              onChange={(e) => setForm({ ...form, shop_address: e.target.value })}
              className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Business Hours
              </label>
              <input
                type="text"
                required
                value={form.business_hours}
                onChange={(e) => setForm({ ...form, business_hours: e.target.value })}
                className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                VAT / Sales Tax (%)
              </label>
              <input
                type="number"
                step="any"
                required
                value={form.tax_rate}
                onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) })}
                className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs sm:text-sm font-mono font-bold text-stone-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
              Receipt Footer Note
            </label>
            <input
              type="text"
              required
              value={form.receipt_footer}
              onChange={(e) => setForm({ ...form, receipt_footer: e.target.value })}
              className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-6 py-3 text-sm font-extrabold text-stone-950 shadow-md hover:bg-amber-400 transition"
        >
          <Save className="h-4 w-4" />
          Save Store Configuration
        </button>
      </form>
    </div>
  );
};
