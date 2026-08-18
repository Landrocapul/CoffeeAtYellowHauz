import React, { useState } from 'react';
import { Discount } from '../../types';
import { AppStore } from '../../services/store';
import {
  Tag,
  Ticket,
  Percent,
  Plus,
  Trash2,
  Check,
  X,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Gift,
} from 'lucide-react';

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  appliedDiscount: Discount | null;
  customIdNumber?: string;
  onApplyDiscount: (discount: Discount, idNumber?: string) => void;
  onRemoveDiscount: () => void;
}

export const DiscountModal: React.FC<DiscountModalProps> = ({
  isOpen,
  onClose,
  subtotal,
  appliedDiscount,
  customIdNumber = '',
  onApplyDiscount,
  onRemoveDiscount,
}) => {
  const [discounts, setDiscounts] = useState<Discount[]>(() => AppStore.getDiscounts());
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [promoError, setPromoError] = useState<string | null>(null);
  const [idNumberInput, setIdNumberInput] = useState(customIdNumber);

  // New Discount Form State
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newType, setNewType] = useState<'percent' | 'fixed'>('percent');
  const [newValue, setNewValue] = useState<number | ''>('');
  const [newDescription, setNewDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const reloadDiscounts = () => {
    setDiscounts(AppStore.getDiscounts());
  };

  const calculateDiscountSavings = (disc: Discount) => {
    if (disc.type === 'percent') {
      return (subtotal * disc.value) / 100;
    }
    return Math.min(subtotal, disc.value);
  };

  const handleApplyCouponCode = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError(null);
    const code = couponCodeInput.trim().toUpperCase();
    if (!code) {
      setPromoError('Please enter a coupon code.');
      return;
    }

    const found = discounts.find(
      (d) =>
        (d.code && d.code.toUpperCase() === code) ||
        d.name.toUpperCase() === code ||
        d.id.toUpperCase() === code
    );

    if (found) {
      onApplyDiscount(found, idNumberInput);
      setCouponCodeInput('');
      onClose();
    } else {
      setPromoError(`Coupon code "${code}" is invalid or expired.`);
    }
  };

  const handleSaveNewDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newName.trim()) {
      setFormError('Discount name is required.');
      return;
    }

    const val = Number(newValue);
    if (isNaN(val) || val <= 0) {
      setFormError('Please enter a valid positive discount value.');
      return;
    }

    if (newType === 'percent' && val > 100) {
      setFormError('Percentage discount cannot exceed 100%.');
      return;
    }

    const created = AppStore.addDiscount({
      name: newName.trim(),
      code: newCode.trim().toUpperCase() || undefined,
      type: newType,
      value: val,
      description: newDescription.trim() || undefined,
      isSystem: false,
    });

    reloadDiscounts();
    setIsCreatingNew(false);
    setNewName('');
    setNewCode('');
    setNewValue('');
    setNewDescription('');

    // Auto apply created discount
    onApplyDiscount(created, idNumberInput);
    onClose();
  };

  const handleDeleteDiscount = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    AppStore.deleteDiscount(id);
    reloadDiscounts();
    if (appliedDiscount?.id === id) {
      onRemoveDiscount();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-stone-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500 text-stone-950 font-bold">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white">
                Coupons &amp; Discounts
              </h3>
              <p className="text-xs text-stone-400">
                Apply government statutory concessions, promo codes, or custom discounts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-stone-400 hover:bg-stone-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Active Applied Discount Banner */}
          {appliedDiscount ? (
            <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50/80 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-white font-bold">
                  <Check className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                      Currently Applied
                    </span>
                    <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-extrabold text-emerald-900">
                      {appliedDiscount.type === 'percent'
                        ? `${appliedDiscount.value}% OFF`
                        : `₱${appliedDiscount.value} OFF`}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-emerald-950">{appliedDiscount.name}</h4>
                  <p className="text-xs text-emerald-700 font-medium">
                    Order savings: <strong className="font-mono">₱{calculateDiscountSavings(appliedDiscount).toFixed(2)}</strong>
                    {appliedDiscount.code && ` (Code: ${appliedDiscount.code})`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onRemoveDiscount}
                className="flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 shadow-xs transition"
              >
                <Trash2 className="h-4 w-4 text-rose-600" />
                <span>Remove Discount</span>
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 flex items-center justify-between text-xs text-stone-600">
              <div className="flex items-center gap-2.5">
                <Tag className="h-4 w-4 text-stone-400" />
                <span>No discount currently applied to this order (Subtotal: <strong>₱{subtotal.toFixed(2)}</strong>).</span>
              </div>
            </div>
          )}

          {/* Quick Coupon Code Input */}
          <form onSubmit={handleApplyCouponCode} className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700">Enter Coupon or Promo Code</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Ticket className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  value={couponCodeInput}
                  onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. PWD20, SENIOR20, VIP15, STUDENT10"
                  className="w-full rounded-xl border border-stone-300 bg-white pl-10 pr-3 py-2.5 text-xs font-mono font-bold tracking-wider text-stone-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 uppercase"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-stone-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-stone-800 transition active:scale-98 shadow-xs"
              >
                Apply Code
              </button>
            </div>
            {promoError && (
              <p className="text-xs font-bold text-rose-600 flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5" />
                {promoError}
              </p>
            )}
          </form>

          {/* Senior / PWD ID Verification Detail (Optional for Receipts) */}
          <div className="rounded-2xl bg-amber-50/60 border border-amber-200/80 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <span>Senior Citizen / PWD ID Card Number</span>
                <span className="text-[10px] font-normal text-amber-800">(Required for statutory audit &amp; receipt)</span>
              </label>
            </div>
            <input
              type="text"
              value={idNumberInput}
              onChange={(e) => setIdNumberInput(e.target.value)}
              placeholder="e.g. OSCA-2024-8849 or PWD-DVO-10294"
              className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-mono text-stone-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          {/* Available Discounts Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-500">
                Available Discount Options
              </h4>
              <button
                type="button"
                onClick={() => setIsCreatingNew(!isCreatingNew)}
                className="flex items-center gap-1 text-xs font-extrabold text-amber-700 hover:text-amber-800"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{isCreatingNew ? 'Cancel New Discount' : 'Create New Discount'}</span>
              </button>
            </div>

            {/* Create New Discount Form */}
            {isCreatingNew && (
              <form
                onSubmit={handleSaveNewDiscount}
                className="rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50/40 p-4 space-y-3 animate-in fade-in duration-150"
              >
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-600" />
                    <span>Create Custom Discount / Coupon</span>
                  </h5>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-stone-700">Discount Name *</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Weekend Treat, Summer Promo"
                      className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-stone-700">Coupon Code (Optional)</label>
                    <input
                      type="text"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                      placeholder="e.g. SUMMER15"
                      className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-mono font-bold uppercase text-stone-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-stone-700">Discount Type</label>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewType('percent')}
                        className={`rounded-xl py-2 text-xs font-bold border transition ${
                          newType === 'percent'
                            ? 'bg-amber-500 text-stone-950 border-amber-600 font-extrabold shadow-2xs'
                            : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        Percentage (%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewType('fixed')}
                        className={`rounded-xl py-2 text-xs font-bold border transition ${
                          newType === 'fixed'
                            ? 'bg-amber-500 text-stone-950 border-amber-600 font-extrabold shadow-2xs'
                            : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        Fixed Amount (₱)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-stone-700">
                      {newType === 'percent' ? 'Percentage (e.g. 15 for 15%) *' : 'Amount in Pesos (e.g. 50 for ₱50) *'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={newType === 'percent' ? 100 : undefined}
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder={newType === 'percent' ? '15' : '50'}
                      className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-mono font-bold text-stone-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-stone-700">Description (Optional)</label>
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="e.g. 15% discount for partner company employees"
                    className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                {formError && (
                  <p className="text-xs font-bold text-rose-600">{formError}</p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-extrabold text-stone-950 shadow-xs hover:bg-amber-400 transition"
                  >
                    Save &amp; Apply Discount
                  </button>
                </div>
              </form>
            )}

            {/* List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {discounts.map((disc) => {
                const isCurrent = appliedDiscount?.id === disc.id;
                const savings = calculateDiscountSavings(disc);

                return (
                  <div
                    key={disc.id}
                    className={`rounded-2xl border p-4 flex flex-col justify-between transition relative ${
                      isCurrent
                        ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-stone-200/90 bg-white hover:border-amber-300 hover:bg-amber-50/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                              disc.type === 'percent'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-emerald-100 text-emerald-900'
                            }`}
                          >
                            {disc.type === 'percent' ? `${disc.value}% OFF` : `₱${disc.value} OFF`}
                          </span>
                          {disc.code && (
                            <span className="rounded-md bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-stone-600 border border-stone-200">
                              {disc.code}
                            </span>
                          )}
                        </div>

                        {!disc.isSystem && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteDiscount(disc.id, e)}
                            title="Delete custom discount"
                            className="text-stone-400 hover:text-rose-600 transition p-0.5"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <h5 className="font-bold text-sm text-stone-900 leading-tight">{disc.name}</h5>
                      {disc.description && (
                        <p className="text-xs text-stone-500 mt-1 line-clamp-2">{disc.description}</p>
                      )}

                      {subtotal > 0 && (
                        <div className="mt-2 text-[11px] font-bold text-stone-600 font-mono">
                          Est. Savings: <span className="text-emerald-700">₱{savings.toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                      {isCurrent ? (
                        <div className="flex items-center gap-2 w-full">
                          <span className="flex-1 text-center py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1">
                            <Check className="h-3.5 w-3.5" /> Applied
                          </span>
                          <button
                            type="button"
                            onClick={onRemoveDiscount}
                            className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onApplyDiscount(disc, idNumberInput);
                            onClose();
                          }}
                          className="w-full rounded-xl bg-stone-900 py-2 text-xs font-bold text-white hover:bg-stone-800 transition active:scale-98 flex items-center justify-center gap-1.5"
                        >
                          <span>Apply to Order</span>
                          <ArrowRight className="h-3.5 w-3.5 text-amber-400" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-stone-50 px-6 py-3 border-t border-stone-200 flex items-center justify-between text-xs text-stone-600">
          <div>
            Subtotal: <strong className="font-mono text-stone-900">₱{subtotal.toFixed(2)}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-stone-900 text-white font-bold px-5 py-2 hover:bg-stone-800 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
