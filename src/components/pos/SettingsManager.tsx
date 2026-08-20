import React, { useState } from 'react';
import { StoreSettings, User } from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
import {
  Settings,
  Save,
  CheckCircle2,
  RotateCcw,
  Building,
  Users,
  Shield,
  Percent,
} from 'lucide-react';
import { SEED_SETTINGS } from '../../data/seedData';
import { CashierAccountManager } from './CashierAccountManager';

interface SettingsManagerProps {
  settings: StoreSettings;
  activeStaff?: User | null;
  onUpdateSettings: (newSettings: StoreSettings) => void;
  onRefreshStaff?: () => void;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({
  settings,
  activeStaff,
  onUpdateSettings,
  onRefreshStaff,
}) => {
  const { showConfirm, showAlert } = useModal();
  const [activeTab, setActiveTab] = useState<'cashiers' | 'store'>('cashiers');
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
      message:
        'Are you sure you want to reset all store configuration back to initial Yellow Hauz defaults?',
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
    <div className="max-w-5xl space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-amber-700">
            System Administration
          </span>
          <h2 className="font-display text-2xl font-extrabold text-stone-900">
            Admin Management &amp; Settings
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage cashier accounts, login credentials, store profile, and tax rules.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-1.5 rounded-2xl bg-stone-200/80 p-1 border border-stone-300/60 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('cashiers')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition cursor-pointer ${
              activeTab === 'cashiers'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Cashier Accounts</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('store')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition cursor-pointer ${
              activeTab === 'store'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
            }`}
          >
            <Building className="h-4 w-4" />
            <span>Store Profile</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Cashier Accounts Management */}
      {activeTab === 'cashiers' && (
        <CashierAccountManager
          currentStaff={activeStaff || null}
          onRefreshStaff={onRefreshStaff}
        />
      )}

      {/* Tab 2: Store Profile & VAT */}
      {activeTab === 'store' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-display text-base font-bold text-stone-900 flex items-center gap-2">
              <Building className="h-4 w-4 text-amber-600" />
              <span>Business Profile &amp; General Configuration</span>
            </h3>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition shadow-2xs"
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
              className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-6 py-3 text-sm font-extrabold text-stone-950 shadow-md hover:bg-amber-400 transition cursor-pointer"
            >
              <Save className="h-4 w-4" />
              Save Store Configuration
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
