import React, { useState, useMemo } from 'react';
import { Order, StoreSettings } from '../../types';
import { AppStore } from '../../services/store';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Banknote,
  QrCode,
  Printer,
  Calendar,
  Download,
  Filter,
  Globe,
  Store,
  Layers,
  Clock,
  RotateCcw,
  ArrowRight,
  Check,
} from 'lucide-react';

interface SalesReportsProps {
  settings: StoreSettings;
  onViewReceipt: (order: Order) => void;
}

type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom' | 'all';

export const SalesReports: React.FC<SalesReportsProps> = ({ settings, onViewReceipt }) => {
  const orders = useMemo(() => AppStore.getOrders(), []);

  // Helper date utilities
  const formatDateForInput = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = useMemo(() => formatDateForInput(new Date()), []);

  // Date Filter States
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Channel & Dining Type Filters
  const [channelFilter, setChannelFilter] = useState<'all' | 'in_store' | 'online'>('all');
  const [filterType, setFilterType] = useState<'all' | 'dine_in' | 'take_away' | 'delivery'>('all');

  const completedOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'completed');
  }, [orders]);

  // Apply Date Filter + Channel Filter + Dining Type Filter
  const filteredOrders = useMemo(() => {
    return completedOrders.filter((o) => {
      // 1. Channel Filter
      const ch = AppStore.getOrderChannel(o);
      if (channelFilter !== 'all' && ch !== channelFilter) return false;

      // 2. Dining Type Filter
      if (filterType !== 'all' && o.orderType !== filterType) return false;

      // 3. Date Filter
      if (datePreset === 'all') return true;

      const orderTime = new Date(o.createdAt).getTime();
      if (isNaN(orderTime)) return true;

      if (datePreset === 'today') {
        const start = new Date(`${todayStr}T00:00:00`).getTime();
        const end = new Date(`${todayStr}T23:59:59.999`).getTime();
        return orderTime >= start && orderTime <= end;
      }

      if (datePreset === 'yesterday') {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        const yStr = formatDateForInput(y);
        const start = new Date(`${yStr}T00:00:00`).getTime();
        const end = new Date(`${yStr}T23:59:59.999`).getTime();
        return orderTime >= start && orderTime <= end;
      }

      if (datePreset === 'week') {
        const w = new Date();
        w.setDate(w.getDate() - 7);
        const wStr = formatDateForInput(w);
        const start = new Date(`${wStr}T00:00:00`).getTime();
        const end = new Date(`${todayStr}T23:59:59.999`).getTime();
        return orderTime >= start && orderTime <= end;
      }

      if (datePreset === 'month') {
        const m = new Date();
        m.setDate(m.getDate() - 30);
        const mStr = formatDateForInput(m);
        const start = new Date(`${mStr}T00:00:00`).getTime();
        const end = new Date(`${todayStr}T23:59:59.999`).getTime();
        return orderTime >= start && orderTime <= end;
      }

      if (datePreset === 'custom') {
        if (startDate && endDate) {
          const start = new Date(`${startDate}T00:00:00`).getTime();
          const end = new Date(`${endDate}T23:59:59.999`).getTime();
          return orderTime >= start && orderTime <= end;
        }
        if (startDate) {
          const start = new Date(`${startDate}T00:00:00`).getTime();
          const end = new Date(`${startDate}T23:59:59.999`).getTime();
          return orderTime >= start && orderTime <= end;
        }
      }

      return true;
    });
  }, [completedOrders, channelFilter, filterType, datePreset, startDate, endDate, todayStr]);

  // Aggregate Metrics
  const grossSales = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + o.subtotal, 0);
  }, [filteredOrders]);

  const totalTax = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + o.taxAmount, 0);
  }, [filteredOrders]);

  const totalDiscounts = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + o.discountAmount, 0);
  }, [filteredOrders]);

  const netRevenue = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  }, [filteredOrders]);

  // Channel Breakdown
  const inStoreCompleted = useMemo(
    () => filteredOrders.filter((o) => AppStore.getOrderChannel(o) === 'in_store'),
    [filteredOrders]
  );
  const onlineCompleted = useMemo(
    () => filteredOrders.filter((o) => AppStore.getOrderChannel(o) === 'online'),
    [filteredOrders]
  );

  const inStoreRevenue = useMemo(
    () => inStoreCompleted.reduce((sum, o) => sum + o.totalAmount, 0),
    [inStoreCompleted]
  );
  const onlineRevenue = useMemo(
    () => onlineCompleted.reduce((sum, o) => sum + o.totalAmount, 0),
    [onlineCompleted]
  );

  // Payment Methods Breakdown
  const cashTotal = useMemo(
    () =>
      filteredOrders
        .filter((o) => o.paymentMethod === 'cash')
        .reduce((sum, o) => sum + o.totalAmount, 0),
    [filteredOrders]
  );
  const gcashTotal = useMemo(
    () =>
      filteredOrders
        .filter((o) => o.paymentMethod === 'gcash')
        .reduce((sum, o) => sum + o.totalAmount, 0),
    [filteredOrders]
  );
  const cardTotal = useMemo(
    () =>
      filteredOrders
        .filter((o) => o.paymentMethod === 'card')
        .reduce((sum, o) => sum + o.totalAmount, 0),
    [filteredOrders]
  );

  // Formatted date period label
  const periodLabel = useMemo(() => {
    if (datePreset === 'today') return `Today (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`;
    if (datePreset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      return `Yesterday (${y.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`;
    }
    if (datePreset === 'week') return 'Last 7 Days';
    if (datePreset === 'month') return 'Last 30 Days';
    if (datePreset === 'all') return 'All Time Recorded';
    if (datePreset === 'custom') {
      if (startDate === endDate) {
        return new Date(`${startDate}T00:00:00`).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
      return `${new Date(`${startDate}T00:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })} – ${new Date(`${endDate}T00:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`;
    }
    return 'Selected Period';
  }, [datePreset, startDate, endDate]);

  const handleExportCSV = () => {
    if (filteredOrders.length === 0) return;
    const headers = [
      'Order #',
      'Channel',
      'Date',
      'Time',
      'Customer',
      'Type',
      'Table',
      'Payment',
      'Subtotal',
      'VAT',
      'Discount',
      'Total',
    ];
    const rows = filteredOrders.map((o) => {
      const d = new Date(o.createdAt);
      return [
        o.orderNumber,
        AppStore.getOrderChannel(o),
        d.toLocaleDateString(),
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        `"${o.customerName}"`,
        o.orderType,
        o.tableNumber || '-',
        o.paymentMethod,
        o.subtotal.toFixed(2),
        o.taxAmount.toFixed(2),
        o.discountAmount.toFixed(2),
        o.totalAmount.toFixed(2),
      ];
    });
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `YellowHauz_SalesReport_${datePreset === 'custom' ? `${startDate}_to_${endDate}` : datePreset}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-amber-700">
            Financial Ledger &amp; Audits
          </span>
          <h2 className="font-display text-2xl font-extrabold text-stone-900">
            Sales Reports
          </h2>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-500">
            <Calendar className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span className="font-semibold text-stone-800">{periodLabel}</span>
            <span>•</span>
            <span>{filteredOrders.length} settled transactions</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={filteredOrders.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 shadow-2xs hover:bg-stone-50 disabled:opacity-50 transition"
          >
            <Download className="h-4 w-4 text-stone-600" />
            Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-extrabold text-stone-950 shadow-md hover:bg-amber-400 transition"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* Date Filter & Range Selector Panel */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-stone-500 mr-1 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-stone-400" />
              Period:
            </span>

            {(
              [
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'week', label: 'Last 7 Days' },
                { id: 'month', label: 'Last 30 Days' },
                { id: 'custom', label: 'Custom Date' },
                { id: 'all', label: 'All Time' },
              ] as const
            ).map((preset) => {
              const isActive = datePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setDatePreset(preset.id);
                  }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    isActive
                      ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Active Period Badge */}
          <div className="flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200/80 text-xs self-start lg:self-auto">
            <span className="text-stone-500 font-medium">Viewing:</span>
            <span className="font-bold text-stone-900">{periodLabel}</span>
            {datePreset !== 'today' && (
              <button
                onClick={() => {
                  setDatePreset('today');
                  setStartDate(todayStr);
                  setEndDate(todayStr);
                }}
                className="ml-1.5 text-amber-700 hover:text-amber-900 font-bold underline text-[11px] flex items-center gap-1"
                title="Reset to Today"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Pickers (Shown when 'custom' is active or always available for quick adjustments) */}
        {datePreset === 'custom' && (
          <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center gap-3 bg-amber-50/40 p-3 rounded-xl border border-amber-100">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-stone-700">From Date:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-900 focus:border-amber-500 focus:outline-none shadow-2xs"
              />
            </div>

            <ArrowRight className="h-3.5 w-3.5 text-stone-400 hidden sm:block" />

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-stone-700">To Date:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-900 focus:border-amber-500 focus:outline-none shadow-2xs"
              />
            </div>

            {/* Quick single-day shortcut */}
            <div className="flex items-center gap-1.5 sm:ml-auto">
              <button
                type="button"
                onClick={() => {
                  setEndDate(startDate);
                }}
                className="rounded-lg bg-white border border-stone-200 px-2.5 py-1 text-[11px] font-bold text-stone-700 hover:bg-stone-50"
              >
                Single Day Only
              </button>
              <button
                type="button"
                onClick={() => {
                  setStartDate(todayStr);
                  setEndDate(todayStr);
                }}
                className="rounded-lg bg-white border border-stone-200 px-2.5 py-1 text-[11px] font-bold text-stone-700 hover:bg-stone-50"
              >
                Set to Today
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Channel Segment Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-stone-100 p-1.5 border border-stone-200">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setChannelFilter('all')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              channelFilter === 'all'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-stone-500" />
            All Channels ({filteredOrders.length})
          </button>
          <button
            onClick={() => setChannelFilter('in_store')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              channelFilter === 'in_store'
                ? 'bg-white text-amber-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Store className="h-3.5 w-3.5 text-amber-600" />
            On-the-Place ({inStoreCompleted.length} • ₱{inStoreRevenue.toFixed(2)})
          </button>
          <button
            onClick={() => setChannelFilter('online')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              channelFilter === 'online'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Globe className="h-3.5 w-3.5 text-indigo-600" />
            Online Orders ({onlineCompleted.length} • ₱{onlineRevenue.toFixed(2)})
          </button>
        </div>

        {/* Dining Type filter */}
        <div className="flex items-center gap-1">
          {(['all', 'dine_in', 'take_away', 'delivery'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold capitalize transition ${
                filterType === type
                  ? 'bg-amber-500 text-stone-950 font-extrabold'
                  : 'bg-white text-stone-600 hover:bg-stone-50'
              }`}
            >
              {type.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Net Revenue ({channelFilter.replace('_', ' ')})
          </span>
          <div className="mt-2 font-display text-2xl font-extrabold text-amber-900 font-mono">
            ₱{netRevenue.toFixed(2)}
          </div>
          <p className="mt-1 text-[11px] text-stone-500">
            From {filteredOrders.length} settled orders in period
          </p>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Gross Subtotal
          </span>
          <div className="mt-2 font-display text-2xl font-extrabold text-stone-900 font-mono">
            ₱{grossSales.toFixed(2)}
          </div>
          <p className="mt-1 text-[11px] text-stone-500">Before discounts &amp; VAT</p>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            VAT Collected (12%)
          </span>
          <div className="mt-2 font-display text-2xl font-extrabold text-stone-900 font-mono">
            ₱{totalTax.toFixed(2)}
          </div>
          <p className="mt-1 text-[11px] text-stone-500">Official sales tax collection</p>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Discounts Granted
          </span>
          <div className="mt-2 font-display text-2xl font-extrabold text-emerald-700 font-mono">
            ₱{totalDiscounts.toFixed(2)}
          </div>
          <p className="mt-1 text-[11px] text-stone-500">Senior, PWD &amp; Promotional</p>
        </div>
      </div>

      {/* Payment Methods Split */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
        <h3 className="font-display text-base font-bold text-stone-900 mb-4">
          Settlement by Payment Tender ({periodLabel})
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 p-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-500 text-stone-950">
              <Banknote className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-stone-600 uppercase">Cash Tender</span>
              <div className="font-mono text-lg font-bold text-stone-900">₱{cashTotal.toFixed(2)}</div>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl bg-sky-50/60 border border-sky-200/80 p-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-sky-500 text-white">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-stone-600 uppercase">GCash E-Wallet</span>
              <div className="font-mono text-lg font-bold text-stone-900">₱{gcashTotal.toFixed(2)}</div>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl bg-stone-100 border border-stone-200 p-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-stone-900 text-white">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-stone-600 uppercase">Debit / Credit Card</span>
              <div className="font-mono text-lg font-bold text-stone-900">₱{cardTotal.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History Table */}
      <div className="rounded-3xl border border-stone-200 bg-white overflow-hidden shadow-xs">
        <div className="p-5 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-stone-900">
              Completed Transactions Ledger
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Filtered for <span className="font-semibold text-stone-800">{periodLabel}</span>
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-stone-100 px-2.5 py-1 rounded-lg text-stone-600">
            {filteredOrders.length} {filteredOrders.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-5 py-3">Receipt #</th>
                <th className="px-5 py-3">Channel</th>
                <th className="px-5 py-3">Date / Time</th>
                <th className="px-5 py-3">Guest &amp; Type</th>
                <th className="px-5 py-3">Payment</th>
                <th className="px-5 py-3 text-right">Subtotal</th>
                <th className="px-5 py-3 text-right">VAT</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-stone-400">
                    <Calendar className="h-8 w-8 mx-auto mb-2 text-stone-300" />
                    <p className="font-bold text-stone-600">No transactions found</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      No settled orders found for the selected date period ({periodLabel}).
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const ch = AppStore.getOrderChannel(ord);
                  const isOnline = ch === 'online';
                  const orderDate = new Date(ord.createdAt);

                  return (
                    <tr key={ord.id} className="hover:bg-stone-50/70 transition">
                      <td className="px-5 py-3.5 font-mono font-bold text-stone-900">{ord.orderNumber}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                            isOnline
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isOnline ? (
                            <>
                              <Globe className="h-3 w-3" />
                              Online
                            </>
                          ) : (
                            <>
                              <Store className="h-3 w-3" />
                              In-Store
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-stone-600">
                        <div className="font-semibold text-stone-800">
                          {orderDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono">
                          {orderDate.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-stone-900">{ord.customerName}</div>
                        <div className="text-[10px] text-stone-400 uppercase">
                          {ord.orderType.replace('_', ' ')} {ord.tableNumber ? `(T#${ord.tableNumber})` : ''}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 uppercase text-stone-700 font-bold">
                        {ord.paymentMethod}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-stone-600">
                        ₱{ord.subtotal.toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-stone-600">
                        ₱{ord.taxAmount.toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-stone-900">
                        ₱{ord.totalAmount.toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => onViewReceipt(ord)}
                          className="rounded-lg bg-stone-100 hover:bg-stone-200 px-2.5 py-1 text-[11px] font-bold text-stone-800 transition"
                        >
                          Receipt
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
