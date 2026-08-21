import React, { useState, useEffect } from 'react';
import { Order, User, StoreSettings } from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
import {
  Search,
  CheckCircle2,
  Clock,
  Printer,
  RotateCcw,
  Globe,
  Store,
  Columns,
  Layers,
  ChefHat,
  Bell,
  User as UserIcon,
  Timer,
  AlertTriangle,
  Flame,
  Check,
} from 'lucide-react';

interface TicketManagementProps {
  activeStaff: User;
  settings: StoreSettings;
  onViewReceipt: (order: Order) => void;
}

type ChannelTab = 'all' | 'in_store' | 'online' | 'split';

export const TicketManagement: React.FC<TicketManagementProps> = ({
  activeStaff,
  settings,
  onViewReceipt,
}) => {
  const { showAlert, showPrompt } = useModal();
  const [orders, setOrders] = useState<Order[]>(() => AppStore.getOrders());
  const [channelTab, setChannelTab] = useState<ChannelTab>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [now, setNow] = useState<number>(() => Date.now());

  // Real-time ticker to update live customer wait times every second
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const refreshOrders = () => {
    setOrders(AppStore.getOrders());
    setNow(Date.now());
  };

  const handleUpdateStatus = (orderId: number, status: Order['status']) => {
    AppStore.updateOrderStatus(orderId, status);
    refreshOrders();
  };

  const handleVoidOrder = async (order: Order) => {
    const pin = await showPrompt({
      title: 'Void Order Authorization',
      message: `Enter Admin Security PIN (1234) to void ticket ${order.orderNumber}:`,
      placeholder: 'Enter 4-digit PIN',
      inputType: 'password',
      confirmText: 'Authorize Void',
      badge: 'admin',
    });

    if (pin === null) return;

    if (pin === '1234' || (activeStaff.role === 'admin' && pin === '1234')) {
      AppStore.updateOrderStatus(order.id, 'cancelled');
      refreshOrders();
      showAlert({
        title: 'Order Voided',
        message: `Order #${order.orderNumber} has been successfully voided and marked as cancelled.`,
        type: 'success',
      });
    } else {
      showAlert({
        title: 'Unauthorized Action',
        message: 'Invalid Admin Security PIN. Ticket voiding was rejected.',
        type: 'error',
      });
    }
  };

  // Helper to categorize channel safely
  const getChannel = (order: Order): 'in_store' | 'online' => {
    return AppStore.getOrderChannel(order);
  };

  const formatDuration = (ms: number): string => {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    return `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
  };

  const getOrderTimings = (order: Order) => {
    const createdTime = new Date(order.createdAt).getTime();
    const processingTime = order.processingStartedAt
      ? new Date(order.processingStartedAt).getTime()
      : null;
    const completedTime = order.completedAt ? new Date(order.completedAt).getTime() : null;

    let pendingDurationMs = 0;
    let processingDurationMs = 0;
    let totalWaitDurationMs = 0;

    if (order.status === 'pending') {
      pendingDurationMs = Math.max(0, now - createdTime);
      processingDurationMs = 0;
      totalWaitDurationMs = pendingDurationMs;
    } else if (order.status === 'processing') {
      const prepStart = processingTime || createdTime;
      pendingDurationMs = Math.max(0, prepStart - createdTime);
      processingDurationMs = Math.max(0, now - prepStart);
      totalWaitDurationMs = Math.max(0, now - createdTime);
    } else if (order.status === 'completed') {
      const end = completedTime || now;
      const prepStart = processingTime || createdTime;
      pendingDurationMs = Math.max(0, prepStart - createdTime);
      processingDurationMs = Math.max(0, end - prepStart);
      totalWaitDurationMs = Math.max(0, end - createdTime);
    } else {
      totalWaitDurationMs = Math.max(0, (completedTime || now) - createdTime);
    }

    const isUrgent = (order.status === 'pending' || order.status === 'processing') && totalWaitDurationMs >= 15 * 60 * 1000;
    const isWarning = (order.status === 'pending' || order.status === 'processing') && totalWaitDurationMs >= 8 * 60 * 1000 && !isUrgent;

    return {
      pendingDurationMs,
      processingDurationMs,
      totalWaitDurationMs,
      isUrgent,
      isWarning,
    };
  };

  const inStoreOrdersAll = orders.filter((o) => getChannel(o) === 'in_store');
  const onlineOrdersAll = orders.filter((o) => getChannel(o) === 'online');
  const pendingOnlineCount = onlineOrdersAll.filter((o) => o.status === 'pending').length;

  // Compute live Kitchen KPIs
  const pendingOrdersList = orders.filter((o) => o.status === 'pending');
  const processingOrdersList = orders.filter((o) => o.status === 'processing');
  const completedOrdersList = orders.filter((o) => o.status === 'completed');

  const avgPendingWaitMs =
    pendingOrdersList.length > 0
      ? pendingOrdersList.reduce((acc, o) => acc + getOrderTimings(o).pendingDurationMs, 0) /
        pendingOrdersList.length
      : 0;

  const avgProcessingTimeMs =
    processingOrdersList.length > 0
      ? processingOrdersList.reduce((acc, o) => acc + getOrderTimings(o).processingDurationMs, 0) /
        processingOrdersList.length
      : 0;

  const avgCompletedWaitMs =
    completedOrdersList.length > 0
      ? completedOrdersList.reduce((acc, o) => acc + getOrderTimings(o).totalWaitDurationMs, 0) /
        completedOrdersList.length
      : 0;

  const matchesFilter = (order: Order, targetChannel?: 'in_store' | 'online') => {
    if (targetChannel && getChannel(order) !== targetChannel) return false;
    if (channelTab !== 'all' && channelTab !== 'split' && getChannel(order) !== channelTab) {
      return false;
    }
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNumber = order.orderNumber.toLowerCase().includes(q);
      const matchCustomer = order.customerName?.toLowerCase().includes(q);
      const matchTable = order.tableNumber ? String(order.tableNumber).includes(q) : false;
      const matchItems = order.items.some((i) => i.name.toLowerCase().includes(q));
      return matchNumber || matchCustomer || matchTable || matchItems;
    }
    return true;
  };

  const filteredOrders = orders.filter((o) => matchesFilter(o));
  const filteredInStore = orders.filter((o) => matchesFilter(o, 'in_store'));
  const filteredOnline = orders.filter((o) => matchesFilter(o, 'online'));

  const renderOrderCard = (order: Order) => {
    const isCompleted = order.status === 'completed';
    const isCancelled = order.status === 'cancelled';
    const isPending = order.status === 'pending';
    const isProcessing = order.status === 'processing';
    const channel = getChannel(order);
    const isOnline = channel === 'online';

    const { pendingDurationMs, processingDurationMs, totalWaitDurationMs, isUrgent, isWarning } =
      getOrderTimings(order);

    return (
      <div
        key={order.id}
        className={`flex flex-col justify-between rounded-3xl border bg-white p-5 shadow-xs transition hover:shadow-md ${
          isUrgent
            ? 'border-rose-400 ring-2 ring-rose-500/20'
            : isWarning
            ? 'border-amber-400 ring-1 ring-amber-500/20'
            : isOnline
            ? 'border-indigo-200/80 ring-1 ring-indigo-500/10'
            : 'border-amber-200/80 ring-1 ring-amber-500/10'
        }`}
      >
        <div>
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-extrabold text-stone-900">
                {order.orderNumber}
              </span>
              <span className="text-[10px] text-stone-400">
                {new Date(order.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Channel badge */}
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                  isOnline
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                    : 'bg-amber-50 text-amber-800 border border-amber-200/60'
                }`}
              >
                {isOnline ? (
                  <>
                    <Globe className="h-3 w-3 text-indigo-600" />
                    Online
                  </>
                ) : (
                  <>
                    <Store className="h-3 w-3 text-amber-600" />
                    In-Store
                  </>
                )}
              </span>

              {/* Status pill */}
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                  isCompleted
                    ? 'bg-emerald-100 text-emerald-800'
                    : isProcessing
                    ? 'bg-sky-100 text-sky-800'
                    : isPending
                    ? 'bg-amber-100 text-amber-800 animate-pulse'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                {order.status}
              </span>
            </div>
          </div>

          {/* Time Spent & Customer Wait Tracker Banner */}
          <div className="mt-3">
            {isPending && (
              <div
                className={`rounded-2xl p-2.5 border flex items-center justify-between gap-2 shadow-2xs ${
                  isUrgent
                    ? 'bg-rose-50 border-rose-300 text-rose-950'
                    : isWarning
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : 'bg-amber-50/70 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`grid h-7 w-7 place-items-center rounded-xl shrink-0 ${
                      isUrgent
                        ? 'bg-rose-600 text-white animate-bounce'
                        : isWarning
                        ? 'bg-amber-500 text-stone-950'
                        : 'bg-amber-400 text-stone-950'
                    }`}
                  >
                    {isUrgent ? <Flame className="h-4 w-4" /> : <Timer className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wide text-amber-800">
                        Waiting in Queue
                      </span>
                      {isUrgent && (
                        <span className="rounded bg-rose-200 px-1 py-0.2 text-[9px] font-black text-rose-900">
                          HIGH WAIT
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-xs sm:text-sm font-black tracking-tight flex items-baseline gap-1">
                      <span>{formatDuration(pendingDurationMs)}</span>
                      <span className="text-[10px] font-normal text-stone-500 font-sans">
                        (Customer Waiting)
                      </span>
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-bold text-amber-700 bg-white/80 rounded-lg px-2 py-1 border border-amber-200 shrink-0">
                  Pending Prep
                </span>
              </div>
            )}

            {isProcessing && (
              <div
                className={`rounded-2xl p-2.5 border space-y-1.5 shadow-2xs ${
                  isUrgent
                    ? 'bg-rose-50/80 border-rose-300'
                    : 'bg-sky-50/90 border-sky-200 text-sky-950'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="grid h-5 w-5 place-items-center rounded-md bg-sky-600 text-white">
                      <ChefHat className="h-3 w-3" />
                    </span>
                    <span className="text-[11px] font-bold text-sky-900">
                      Kitchen Prep Time:
                    </span>
                  </div>
                  <span className="font-mono text-xs font-black text-sky-800">
                    {formatDuration(processingDurationMs)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-sky-200/70 text-stone-600">
                  <span className="flex items-center gap-1 text-[10px]">
                    <Clock className="h-3 w-3 text-stone-400" />
                    Total Wait: (Queue {formatDuration(pendingDurationMs)})
                  </span>
                  <span className="font-mono font-bold text-stone-900 text-xs">
                    {formatDuration(totalWaitDurationMs)}
                  </span>
                </div>
              </div>
            )}

            {isCompleted && (
              <div className="rounded-2xl bg-emerald-50/80 p-2.5 border border-emerald-200 text-emerald-950 flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-600 text-white shrink-0">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-800 block">
                      Total Customer Wait Time
                    </span>
                    <span className="font-mono text-xs font-black text-emerald-950">
                      {formatDuration(totalWaitDurationMs)}
                    </span>
                  </div>
                </div>
                <div className="text-right text-[9px] text-stone-500 font-semibold shrink-0">
                  <div>Queue: {formatDuration(pendingDurationMs)}</div>
                  <div>Prep: {formatDuration(processingDurationMs)}</div>
                </div>
              </div>
            )}

            {isCancelled && (
              <div className="rounded-2xl bg-stone-100 p-2 border border-stone-200 text-stone-600 flex items-center justify-between text-[10px] font-bold">
                <span>Voided / Cancelled</span>
                <span className="font-mono">Time: {formatDuration(totalWaitDurationMs)}</span>
              </div>
            )}
          </div>

          {/* Customer & Dining Context */}
          <div className="mt-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-stone-900">
              <UserIcon className="h-3.5 w-3.5 text-stone-400" />
              <span>{order.customerName || (isOnline ? 'Online Customer' : 'Walk-in Guest')}</span>
            </div>
            <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase text-stone-700">
              {order.orderType.replace('_', ' ')}{' '}
              {order.tableNumber ? `• Table #${order.tableNumber}` : ''}
            </span>
          </div>

          {/* Items List */}
          <div className="my-3 space-y-1.5 border-y border-stone-100 py-3 text-xs">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start">
                <div className="flex-1 pr-2">
                  <span className="font-medium text-stone-800">
                    <span className="font-bold text-amber-800 mr-1.5">{item.quantity}x</span>
                    {item.name}
                  </span>
                  {item.specialInstructions && (
                    <p className="text-[10px] italic text-amber-700 ml-4">
                      "{item.specialInstructions}"
                    </p>
                  )}
                </div>
                <span className="font-mono text-stone-600">₱{item.totalPrice.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Financial & Payment Info */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-500 uppercase font-bold text-[10px] flex items-center gap-1">
              Paid via {order.paymentMethod}
              {order.cashierName && (
                <span className="text-stone-400 font-normal">({order.cashierName})</span>
              )}
            </span>
            <span className="font-mono text-base font-extrabold text-stone-900">
              ₱{order.totalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Status Actions */}
        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
          <button
            onClick={() => onViewReceipt(order)}
            className="flex items-center gap-1 rounded-xl bg-stone-100 hover:bg-stone-200 px-3 py-1.5 text-xs font-bold text-stone-800 transition active:scale-95"
          >
            <Printer className="h-3.5 w-3.5" />
            Receipt
          </button>

          <div className="flex items-center gap-1.5">
            {isPending && (
              <button
                onClick={() => handleUpdateStatus(order.id, 'processing')}
                className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-sky-500 transition shadow-xs active:scale-95"
              >
                <ChefHat className="h-3.5 w-3.5" />
                Start Prep
              </button>
            )}
            {isProcessing && (
              <button
                onClick={() => handleUpdateStatus(order.id, 'completed')}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-xs active:scale-95"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Complete
              </button>
            )}
            {!isCancelled && (
              <button
                onClick={() => handleVoidOrder(order)}
                className="rounded-xl border border-rose-200 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition active:scale-95"
                title="Void ticket with admin PIN"
              >
                Void
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-amber-700">
            Kitchen &amp; Cashier Register
          </span>
          <h2 className="font-display text-2xl font-extrabold text-stone-900">
            Ticket Management
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Real-time queue &amp; prep timers showing exactly how long customers waited for their orders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticket #, guest, table..."
              className="w-full rounded-xl border border-stone-300 bg-white pl-10 pr-4 py-2 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <button
            onClick={refreshOrders}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition active:scale-95"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Live Kitchen & Wait Time Performance KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Pending Queue */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-amber-800 tracking-wider">
              Pending Queue
            </span>
            <div className="font-display text-lg font-black text-amber-950 mt-0.5">
              {pendingOrdersList.length} <span className="text-xs font-normal text-amber-800">tickets</span>
            </div>
            <p className="text-[10px] text-amber-700 mt-0.5">
              Avg Wait: <span className="font-mono font-bold">{formatDuration(avgPendingWaitMs)}</span>
            </p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500 text-stone-950 shadow-2xs">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* Metric 2: Active Kitchen Prep */}
        <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-sky-800 tracking-wider">
              In Kitchen Prep
            </span>
            <div className="font-display text-lg font-black text-sky-950 mt-0.5">
              {processingOrdersList.length} <span className="text-xs font-normal text-sky-800">in prep</span>
            </div>
            <p className="text-[10px] text-sky-700 mt-0.5">
              Avg Prep: <span className="font-mono font-bold">{formatDuration(avgProcessingTimeMs)}</span>
            </p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-600 text-white shadow-2xs">
            <ChefHat className="h-5 w-5" />
          </div>
        </div>

        {/* Metric 3: Avg Completed Turnaround */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-emerald-800 tracking-wider">
              Avg Total Wait (Completed)
            </span>
            <div className="font-display text-lg font-black text-emerald-950 mt-0.5">
              <span className="font-mono">{formatDuration(avgCompletedWaitMs)}</span>
            </div>
            <p className="text-[10px] text-emerald-700 mt-0.5">
              {completedOrdersList.length} orders fulfilled today
            </p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-white shadow-2xs">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        {/* Metric 4: Live Clock Status */}
        <div className="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-stone-500 tracking-wider">
              Live Kitchen Clock
            </span>
            <div className="font-mono text-base font-black text-stone-900 mt-0.5">
              {new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <p className="text-[10px] text-stone-500 mt-0.5 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live auto-ticking timer
            </p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-stone-900 text-white shadow-2xs">
            <Timer className="h-5 w-5 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Primary Channel Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-stone-100/80 p-1.5 border border-stone-200">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setChannelTab('all')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              channelTab === 'all'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-stone-500" />
            All Tickets
            <span className="rounded-full bg-stone-200 px-1.5 py-0.2 text-[10px] font-extrabold text-stone-700">
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => setChannelTab('in_store')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              channelTab === 'in_store'
                ? 'bg-white text-amber-900 shadow-xs border-amber-300'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
            }`}
          >
            <Store className="h-3.5 w-3.5 text-amber-600" />
            On-the-Place (In-Store)
            <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-extrabold text-amber-800">
              {inStoreOrdersAll.length}
            </span>
          </button>

          <button
            onClick={() => setChannelTab('online')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              channelTab === 'online'
                ? 'bg-white text-indigo-900 shadow-xs border-indigo-300'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
            }`}
          >
            <Globe className="h-3.5 w-3.5 text-indigo-600" />
            Online Orders
            <span className="rounded-full bg-indigo-100 px-1.5 py-0.2 text-[10px] font-extrabold text-indigo-800">
              {onlineOrdersAll.length}
            </span>
            {pendingOnlineCount > 0 && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
              </span>
            )}
          </button>
        </div>

        {/* Dual Split-View Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChannelTab(channelTab === 'split' ? 'all' : 'split')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              channelTab === 'split'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            <Columns className="h-3.5 w-3.5" />
            Dual Split View
          </button>
        </div>
      </div>

      {/* Status Filter Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-stone-500 mr-1">Status:</span>
        {['all', 'pending', 'processing', 'completed', 'cancelled'].map((st) => {
          const count =
            channelTab === 'in_store'
              ? st === 'all'
                ? inStoreOrdersAll.length
                : inStoreOrdersAll.filter((o) => o.status === st).length
              : channelTab === 'online'
              ? st === 'all'
                ? onlineOrdersAll.length
                : onlineOrdersAll.filter((o) => o.status === st).length
              : st === 'all'
              ? orders.length
              : orders.filter((o) => o.status === st).length;

          return (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold capitalize transition ${
                statusFilter === st
                  ? 'bg-amber-500 text-stone-950 font-extrabold shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
              }`}
            >
              {st} ({count})
            </button>
          );
        })}
      </div>

      {/* Orders Display: Split Mode vs Unified Grid */}
      {channelTab === 'split' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: On-the-Place Orders */}
          <div className="rounded-3xl border border-amber-200 bg-amber-50/40 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500 text-stone-950">
                  <Store className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">On-the-Place (In-Store)</h3>
                  <p className="text-[10px] text-stone-500">Dine-In tables &amp; Counter Orders</p>
                </div>
              </div>
              <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-xs font-extrabold text-amber-900">
                {filteredInStore.length}
              </span>
            </div>

            {filteredInStore.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-amber-200 bg-white/70 p-8 text-center text-xs text-stone-500">
                No in-store orders match current filter.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredInStore.map((order) => renderOrderCard(order))}
              </div>
            )}
          </div>

          {/* Right Column: Online Orders */}
          <div className="rounded-3xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-200/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-600 text-white">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">Online Orders</h3>
                  <p className="text-[10px] text-stone-500">Customer web portal &amp; advance orders</p>
                </div>
              </div>
              <span className="rounded-full bg-indigo-200/80 px-2.5 py-0.5 text-xs font-extrabold text-indigo-900">
                {filteredOnline.length}
              </span>
            </div>

            {filteredOnline.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-indigo-200 bg-white/70 p-8 text-center text-xs text-stone-500">
                No online orders match current filter.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOnline.map((order) => renderOrderCard(order))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Unified Grid Mode (All, In-Store, or Online Tab) */
        <div>
          {filteredOrders.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-12 text-center text-xs text-stone-500">
              No orders found matching this channel and status filter.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredOrders.map((order) => renderOrderCard(order))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

