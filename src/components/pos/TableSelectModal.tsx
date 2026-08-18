import React, { useState } from 'react';
import { Table } from '../../types';
import {
  X,
  Utensils,
  ShoppingBag,
  Users,
  CheckCircle2,
  Wind,
  Sun,
  Layers,
} from 'lucide-react';

interface TableSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: Table[];
  selectedTable: number | '';
  onSelectTable: (tableNumber: number) => void;
  onNoTableNeeded: () => void;
}

export const TableSelectModal: React.FC<TableSelectModalProps> = ({
  isOpen,
  onClose,
  tables,
  selectedTable,
  onSelectTable,
  onNoTableNeeded,
}) => {
  const [areaFilter, setAreaFilter] = useState<'all' | 'airconditioned' | 'normal'>('all');

  if (!isOpen) return null;

  const filteredTables = tables.filter((t) => {
    if (areaFilter === 'all') return true;
    return t.area === areaFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500 text-stone-950 shadow-xs">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold text-stone-900">
                Choose Table or Dining Option
              </h3>
              <p className="text-xs text-stone-500">
                Select a table for dine-in, or choose no table needed to proceed
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-200 p-1.5 text-stone-400 hover:bg-stone-50 hover:text-stone-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Primary Action: No Table Needed (Take-out / Counter Pick-up) */}
        <button
          type="button"
          onClick={onNoTableNeeded}
          className="w-full group flex items-center justify-between rounded-2xl border-2 border-dashed border-amber-300 bg-gradient-to-r from-amber-50/80 to-amber-100/50 p-3.5 hover:bg-amber-100/80 hover:border-amber-400 transition text-left active:scale-98 shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500 text-stone-950 shadow-xs group-hover:scale-105 transition">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-amber-950">
                  No Table Needed
                </span>
                <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                  Take-out / Quick Serve
                </span>
              </div>
              <p className="text-xs text-amber-800/80 mt-0.5">
                Proceed directly to payment without assigning a table
              </p>
            </div>
          </div>
          <span className="rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-extrabold text-stone-950 group-hover:bg-amber-400 transition shadow-2xs">
            Select &amp; Pay →
          </span>
        </button>

        {/* Divider / Table Selection Header */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-stone-700 uppercase tracking-wide flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-amber-600" />
              <span>Or Choose a Dining Table:</span>
            </span>

            {/* Area Filter Tabs */}
            <div className="flex gap-1 bg-stone-100 p-0.5 rounded-xl text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setAreaFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  areaFilter === 'all'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                All ({tables.length})
              </button>
              <button
                type="button"
                onClick={() => setAreaFilter('airconditioned')}
                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                  areaFilter === 'airconditioned'
                    ? 'bg-sky-500 text-white shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Wind className="h-3 w-3" />
                <span>AC</span>
              </button>
              <button
                type="button"
                onClick={() => setAreaFilter('normal')}
                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                  areaFilter === 'normal'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Sun className="h-3 w-3" />
                <span>Main</span>
              </button>
            </div>
          </div>

          {/* Tables Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
            {filteredTables.map((t) => {
              const isSelected = selectedTable === t.tableNumber;
              const isOccupied = t.status === 'occupied';
              const isReserved = t.status === 'reserved';

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectTable(t.tableNumber)}
                  className={`relative flex flex-col justify-between rounded-2xl border p-3 text-left transition active:scale-95 ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/90 shadow-md ring-2 ring-amber-400'
                      : isOccupied
                      ? 'border-rose-200 bg-rose-50/40 hover:border-rose-300'
                      : isReserved
                      ? 'border-amber-200 bg-amber-50/30 hover:border-amber-300'
                      : 'border-stone-200 bg-white hover:border-amber-400 hover:bg-stone-50/80 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-extrabold text-stone-900">
                      Table #{t.tableNumber}
                    </span>
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
                        isOccupied
                          ? 'bg-rose-100 text-rose-700'
                          : isReserved
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{t.capacity || 4} Seats</span>
                    </span>
                    <span className="text-[10px] font-semibold text-stone-400">
                      {t.area === 'airconditioned' ? 'AC Area' : 'Main Area'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
