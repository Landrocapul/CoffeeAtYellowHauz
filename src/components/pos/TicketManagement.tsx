import React, { useState } from 'react';
import { Order, User, StoreSettings } from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Printer,
  Ban,
  Utensils,
  ShoppingBag,
  Truck,
  RotateCcw,
  Globe,
  Store,
  Columns,
  Layers,
  ChefHat,
  Bell,
  User as UserIcon,
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

  const refreshOrders = () => {
    setOrders(AppStore.getOrders());
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

  const inStoreOrdersAll = orders.filter((o) => getChannel(o) === 'in_store');
  const onlineOrdersAll = orders.filter((o) => getChannel(o) === 'online');
  const pendingOnlineCount = onlineOrdersAll.filter((o) => o.status === 'pending').length;

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

    return (
      <div
        key={order.id}
        className={`flex flex-col justify-between rounded-3xl border bg-white p-5 shadow-xs transition hover:shadow-md ${
          isOnline
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
                className="flex items-center gap-1 rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-500 transition shadow-xs active:scale-95"
              >
                <ChefHat className="h-3.5 w-3.5" />
                Start Prep
              </button>
            )}
            {isProcessing && (
              <button
                onClick={() => handleUpdateStatus(order.id, 'completed')}
                className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-xs active:scale-95"
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
            Separately manage On-the-Place (In-Store) POS orders and Online Customer tickets in real time.
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
