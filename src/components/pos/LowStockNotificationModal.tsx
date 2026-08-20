import React, { useState } from 'react';
import { MenuItem, Category, User } from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Package,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  X,
  Sparkles,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';

interface LowStockNotificationModalProps {
  isOpen?: boolean;
  onClose: () => void;
  categories?: Category[];
  activeStaff?: User | null;
  onNavigateToInventory?: () => void;
}

export const LowStockNotificationModal: React.FC<LowStockNotificationModalProps> = ({
  isOpen = true,
  onClose,
  categories = [],
  activeStaff = null,
  onNavigateToInventory,
}) => {
  const { showAlert, showPrompt, showConfirm } = useModal();
  const [items, setItems] = useState<MenuItem[]>(() => AppStore.getMenuItems());
  const [filterType, setFilterType] = useState<'all' | 'out_of_stock' | 'low_stock'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [restockingId, setRestockingId] = useState<number | null>(null);

  const availableCategories = categories.length > 0 ? categories : AppStore.getCategories();

  // Subscribe to changes
  React.useEffect(() => {
    const unsub = AppStore.subscribe(() => {
      setItems(AppStore.getMenuItems());
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const lowStockItems = items.filter((i) => (i.quantity ?? 0) <= 5);
  const outOfStockItems = items.filter((i) => (i.quantity ?? 0) <= 0);
  const criticalLowItems = items.filter((i) => (i.quantity ?? 0) > 0 && (i.quantity ?? 0) <= 5);

  const displayedItems = lowStockItems.filter((item) => {
    if (filterType === 'out_of_stock' && (item.quantity ?? 0) > 0) return false;
    if (filterType === 'low_stock' && ((item.quantity ?? 0) <= 0 || (item.quantity ?? 0) > 5)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const cat = availableCategories.find((c) => c.id === item.categoryId);
      const catName = cat ? cat.name.toLowerCase() : '';
      return item.name.toLowerCase().includes(q) || catName.includes(q);
    }
    return true;
  });

  const handleQuickRestock = async (item: MenuItem, amount: number) => {
    setRestockingId(item.id);
    const updated = AppStore.quickRestockItem(item.id, amount);
    setTimeout(() => {
      setRestockingId(null);
    }, 400);

    if (updated) {
      showAlert({
        title: 'Stock Replenished',
        message: `Added +${amount} units to "${item.name}". New inventory level: ${updated.quantity} units.`,
        type: 'success',
      });
    }
  };

  const handleCustomRestock = async (item: MenuItem) => {
    const input = await showPrompt({
      title: `Restock ${item.name}`,
      message: `Current stock is ${item.quantity} units. Enter the quantity to add to inventory:`,
      defaultValue: '15',
      placeholder: 'e.g. 20',
      inputType: 'number',
      confirmText: 'Add Stock',
      cancelText: 'Cancel',
      validate: (val) => {
        const n = parseInt(val, 10);
        if (isNaN(n) || n <= 0) return 'Please enter a valid positive number';
        if (n > 500) return 'Maximum batch add is 500 units';
        return null;
      },
    });

    if (input) {
      const qty = parseInt(input, 10);
      handleQuickRestock(item, qty);
    }
  };

  const handleBatchRestockAll = async () => {
    if (lowStockItems.length === 0) return;

    const confirmed = await showConfirm({
      title: 'Restock All Low Items?',
      message: `This will automatically add +15 units of stock to all ${lowStockItems.length} low-stock and out-of-stock items and mark them available.`,
      type: 'warning',
      confirmText: `Add +15 to ${lowStockItems.length} Items`,
      cancelText: 'Cancel',
    });

    if (confirmed) {
      const count = AppStore.batchRestockLowStock(5, 15);
      showAlert({
        title: 'Batch Restock Complete',
        message: `Successfully added +15 units to ${count} low-stock items!`,
        type: 'success',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-stone-900 text-white p-5 sm:p-6 border-b border-stone-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-amber-500 text-stone-950 shadow-md">
              <Bell className="h-6 w-6 stroke-[2.5]" />
              {lowStockItems.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white ring-2 ring-stone-900 animate-pulse">
                  {lowStockItems.length}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg sm:text-xl font-black text-amber-400">
                  Low Stock In-App Alerts
                </h3>
                <span className="rounded-md bg-stone-800 border border-stone-700 px-2 py-0.5 text-[10px] font-extrabold uppercase text-amber-300">
                  {activeStaff?.role === 'admin' ? 'Admin & Cashier View' : 'Cashier Notification'}
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-0.5">
                Real-time inventory monitor for active store operations and quick replenishment.
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

        {/* Summary Metric Pills & Filters */}
        <div className="bg-stone-50 border-b border-stone-200 p-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 rounded-xl bg-stone-200/70 p-1">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`rounded-lg px-3 py-1.5 font-bold transition ${
                filterType === 'all'
                  ? 'bg-white text-stone-950 shadow-xs'
                  : 'text-stone-600 hover:text-stone-950'
              }`}
            >
              <span>All Alerts</span>
              <span className="ml-1.5 rounded-full bg-stone-100 px-1.5 py-0.2 text-[10px] font-mono">
                {lowStockItems.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('out_of_stock')}
              className={`rounded-lg px-3 py-1.5 font-bold transition ${
                filterType === 'out_of_stock'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-stone-600 hover:text-rose-700'
              }`}
            >
              <span>Out of Stock</span>
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                  filterType === 'out_of_stock'
                    ? 'bg-rose-800 text-white'
                    : 'bg-rose-100 text-rose-800 font-extrabold'
                }`}
              >
                {outOfStockItems.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('low_stock')}
              className={`rounded-lg px-3 py-1.5 font-bold transition ${
                filterType === 'low_stock'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'text-stone-600 hover:text-amber-800'
              }`}
            >
              <span>Low (1–5)</span>
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                  filterType === 'low_stock'
                    ? 'bg-stone-950 text-amber-400'
                    : 'bg-amber-100 text-amber-900 font-extrabold'
                }`}
              >
                {criticalLowItems.length}
              </span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter low stock items..."
              className="w-full rounded-xl border border-stone-300 bg-white pl-8 pr-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {displayedItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/70 p-8 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500" />
              <h4 className="font-bold text-stone-800 text-sm">
                {lowStockItems.length === 0
                  ? 'All Inventory Levels are Healthy!'
                  : 'No items match your search filter'}
              </h4>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                {lowStockItems.length === 0
                  ? 'All drinks, food, and menu items currently have 6 or more units in stock.'
                  : 'Try clearing the search query or changing the filter.'}
              </p>
            </div>
          ) : (
            displayedItems.map((item) => {
              const cat = categories.find((c) => c.id === item.categoryId);
              const isOut = item.quantity <= 0;
              const isCrit = item.quantity > 0 && item.quantity <= 2;

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl p-3.5 sm:p-4 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isOut
                      ? 'bg-rose-50/50 border-rose-200'
                      : isCrit
                      ? 'bg-amber-50/50 border-amber-300'
                      : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <img
                        src={item.imageUrl || '/images/latte.webp'}
                        alt={item.name}
                        className="h-12 w-12 rounded-xl object-cover border border-stone-200 bg-stone-100"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/latte.webp';
                        }}
                      />
                      {isOut && (
                        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-white shadow-xs">
                          <AlertCircle className="h-3 w-3 stroke-[3]" />
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-stone-900 text-sm">
                          {item.name}
                        </span>
                        <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-600">
                          {cat?.name || 'Item'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-xs font-bold text-stone-700">
                          ₱{item.price.toFixed(2)}
                        </span>
                        <span className="text-stone-300">•</span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                            isOut
                              ? 'bg-rose-600 text-white animate-pulse'
                              : isCrit
                              ? 'bg-amber-500 text-stone-950'
                              : 'bg-amber-100 text-amber-900 border border-amber-200'
                          }`}
                        >
                          {isOut ? (
                            <>
                              <AlertCircle className="h-3 w-3" />
                              <span>0 left • Sold Out</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-3 w-3" />
                              <span>Only {item.quantity} units left</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Restock Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <span className="text-[10px] font-bold uppercase text-stone-400 hidden md:inline mr-1">
                      Quick Restock:
                    </span>
                    <button
                      type="button"
                      disabled={restockingId === item.id}
                      onClick={() => handleQuickRestock(item, 5)}
                      className="rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-bold text-stone-800 hover:bg-stone-50 hover:border-amber-400 active:scale-95 transition shadow-2xs cursor-pointer"
                      title="Add 5 units"
                    >
                      +5
                    </button>
                    <button
                      type="button"
                      disabled={restockingId === item.id}
                      onClick={() => handleQuickRestock(item, 10)}
                      className="rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-extrabold text-amber-950 hover:bg-amber-100 active:scale-95 transition shadow-2xs cursor-pointer"
                      title="Add 10 units"
                    >
                      +10
                    </button>
                    <button
                      type="button"
                      disabled={restockingId === item.id}
                      onClick={() => handleQuickRestock(item, 25)}
                      className="rounded-xl bg-stone-900 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-stone-800 active:scale-95 transition shadow-2xs cursor-pointer"
                      title="Add 25 units"
                    >
                      +25
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCustomRestock(item)}
                      className="rounded-xl border border-dashed border-stone-300 px-2.5 py-1.5 text-xs font-bold text-stone-600 hover:bg-stone-50 hover:border-stone-400 transition cursor-pointer"
                      title="Add custom quantity"
                    >
                      Custom...
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-stone-200 bg-stone-50 p-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-stone-500 text-[11px]">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>
              Low stock threshold is configured at <strong>5 or fewer units</strong>.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {lowStockItems.length > 0 && (
              <button
                type="button"
                onClick={handleBatchRestockAll}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 font-extrabold text-stone-950 hover:bg-amber-400 transition active:scale-95 shadow-xs cursor-pointer"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                <span>Restock All (+15 each)</span>
              </button>
            )}

            {onNavigateToInventory && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToInventory();
                }}
                className="flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 font-bold text-stone-800 hover:bg-stone-100 transition cursor-pointer"
              >
                <Package className="h-4 w-4 text-amber-600" />
                <span>Open Inventory Hub</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-200 px-4 py-2 font-bold text-stone-600 hover:bg-stone-200/60 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
