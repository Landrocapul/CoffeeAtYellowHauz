import React, { useState } from 'react';
import { Table, Order, Reservation } from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
import {
  Users,
  CheckCircle,
  Clock,
  Ban,
  RefreshCw,
  Sparkles,
  Filter,
  Globe,
  Store,
  Columns,
  Layers,
  Calendar,
  Phone,
  MessageSquare,
  CheckCircle2,
  XCircle,
  UserCheck,
  Search,
  Plus,
  AlertCircle,
} from 'lucide-react';

interface TableManagementProps {
  onSelectTableForOrder?: (tableNumber: number) => void;
  onViewOrderReceipt?: (order: Order) => void;
}

type MainViewTab = 'all' | 'floor_tables' | 'online_reservations' | 'split';

export const TableManagement: React.FC<TableManagementProps> = ({
  onSelectTableForOrder,
  onViewOrderReceipt,
}) => {
  const { showAlert, showConfirm } = useModal();
  const [tables, setTables] = useState<Table[]>(() => AppStore.getTables());
  const [reservations, setReservations] = useState<Reservation[]>(() =>
    AppStore.getReservations()
  );
  const [mainTab, setMainTab] = useState<MainViewTab>('all');
  const [selectedArea, setSelectedArea] = useState<'all' | 'airconditioned' | 'normal'>('all');
  const [resStatusFilter, setResStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewResModalOpen, setIsNewResModalOpen] = useState(false);

  // New reservation form state for staff manual entry
  const [newResForm, setNewResForm] = useState({
    customerName: '',
    contactNumber: '',
    guestCount: 2,
    tableId: 1,
    reservationAt: new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 16),
    notes: '',
  });

  const orders = AppStore.getOrders();

  const refreshData = () => {
    setTables(AppStore.getTables());
    setReservations(AppStore.getReservations());
  };

  const handleTableStatusChange = (tableId: number, newStatus: Table['status']) => {
    const updated = AppStore.updateTableStatus(tableId, newStatus);
    if (updated) {
      refreshData();
    }
  };

  const handleUpdateReservationStatus = async (
    reservationId: number,
    newStatus: Reservation['status']
  ) => {
    const res = reservations.find((r) => r.id === reservationId);
    if (!res) return;

    if (newStatus === 'cancelled') {
      const ok = await showConfirm({
        title: 'Cancel Online Reservation?',
        message: `Are you sure you want to cancel reservation ${res.reservationCode} for ${res.customerName}? This will free Table #${res.tableNumber}.`,
        type: 'warning',
        confirmText: 'Yes, Cancel Booking',
        cancelText: 'Keep Active',
      });
      if (!ok) return;
    }

    AppStore.updateReservationStatus(reservationId, newStatus);
    refreshData();

    if (newStatus === 'confirmed') {
      showAlert({
        title: 'Reservation Confirmed',
        message: `Booking #${res.reservationCode} is confirmed and Table #${res.tableNumber} is marked as reserved.`,
        type: 'success',
      });
    } else if (newStatus === 'completed') {
      // Seat guest -> set table to occupied
      if (res.tableId) {
        AppStore.updateTableStatus(res.tableId, 'occupied');
      }
      refreshData();
      showAlert({
        title: 'Guests Seated',
        message: `Guests for ${res.customerName} have been seated at Table #${res.tableNumber}. Table status set to Occupied.`,
        type: 'success',
      });
    } else if (newStatus === 'cancelled') {
      showAlert({
        title: 'Reservation Cancelled',
        message: `Reservation #${res.reservationCode} was cancelled. Table #${res.tableNumber} is now available.`,
        type: 'info',
      });
    }
  };

  const handleCreateStaffReservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResForm.customerName.trim() || !newResForm.contactNumber.trim()) {
      showAlert({
        title: 'Missing Fields',
        message: 'Please provide guest name and contact number.',
        type: 'warning',
      });
      return;
    }

    const selectedTableObj = tables.find((t) => t.id === Number(newResForm.tableId));

    AppStore.createReservation({
      tableId: Number(newResForm.tableId),
      tableNumber: selectedTableObj ? selectedTableObj.tableNumber : 1,
      customerId: null,
      customerName: newResForm.customerName.trim(),
      contactNumber: newResForm.contactNumber.trim(),
      guestCount: Number(newResForm.guestCount) || 2,
      reservationAt: newResForm.reservationAt,
      notes: newResForm.notes.trim(),
    });

    // Auto mark confirmed
    const latest = AppStore.getReservations()[0];
    if (latest) {
      AppStore.updateReservationStatus(latest.id, 'confirmed');
    }

    refreshData();
    setIsNewResModalOpen(false);
    setNewResForm({
      customerName: '',
      contactNumber: '',
      guestCount: 2,
      tableId: 1,
      reservationAt: new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 16),
      notes: '',
    });

    showAlert({
      title: 'Reservation Created',
      message: `Table #${selectedTableObj?.tableNumber || 1} has been booked and reserved for ${newResForm.customerName}.`,
      type: 'success',
    });
  };

  // Metrics
  const availableCount = tables.filter((t) => t.status === 'available').length;
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length;
  const reservedCount = tables.filter((t) => t.status === 'reserved').length;
  const pendingOnlineResCount = reservations.filter((r) => r.status === 'pending').length;
  const confirmedOnlineResCount = reservations.filter((r) => r.status === 'confirmed').length;

  // Filtered tables
  const filteredTables = tables.filter((t) => {
    if (selectedArea !== 'all' && t.area !== selectedArea) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNumber = String(t.tableNumber).includes(q);
      const matchArea = t.area.toLowerCase().includes(q);
      return matchNumber || matchArea;
    }
    return true;
  });

  // Filtered reservations
  const filteredReservations = reservations.filter((r) => {
    if (resStatusFilter !== 'all' && r.status !== resStatusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = r.reservationCode.toLowerCase().includes(q);
      const matchName = r.customerName.toLowerCase().includes(q);
      const matchPhone = r.contactNumber.toLowerCase().includes(q);
      const matchTable = r.tableNumber ? String(r.tableNumber).includes(q) : false;
      return matchCode || matchName || matchPhone || matchTable;
    }
    return true;
  });

  // Helper to find online reservation for a table
  const getTableActiveReservation = (tableId: number) => {
    return reservations.find(
      (r) =>
        r.tableId === tableId &&
        (r.status === 'confirmed' || r.status === 'pending')
    );
  };

  // Render a Single Floor Table Card
  const renderTableCard = (table: Table) => {
    const activeOrder = table.currentOrderId
      ? orders.find((o) => o.id === table.currentOrderId)
      : null;

    const activeRes = getTableActiveReservation(table.id);

    const isAvailable = table.status === 'available';
    const isOccupied = table.status === 'occupied';
    const isReserved = table.status === 'reserved';

    return (
      <div
        key={table.id}
        className={`flex flex-col justify-between rounded-3xl border p-5 shadow-xs transition hover:shadow-md ${
          isAvailable
            ? 'border-emerald-200 bg-white hover:border-emerald-300 ring-1 ring-emerald-500/10'
            : isOccupied
            ? 'border-rose-200 bg-rose-50/40 hover:border-rose-300 ring-1 ring-rose-500/10'
            : 'border-indigo-200 bg-indigo-50/40 hover:border-indigo-300 ring-1 ring-indigo-500/10'
        }`}
      >
        <div>
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-extrabold text-stone-900">
                Table #{table.tableNumber}
              </span>
              <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600 uppercase">
                {table.area === 'airconditioned' ? '❄️ AC Room' : '🌿 Main'}
              </span>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                isAvailable
                  ? 'bg-emerald-100 text-emerald-800'
                  : isOccupied
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-indigo-100 text-indigo-800'
              }`}
            >
              {table.status}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-stone-600">
            <span className="flex items-center gap-1 font-semibold">
              <Users className="h-3.5 w-3.5 text-stone-400" />
              {table.capacity} Guest Capacity
            </span>
            <span className="text-[10px] text-stone-400 font-mono">ID: T-{table.id}</span>
          </div>

          {/* Active Online Reservation Notification on Table Card */}
          {activeRes && (
            <div className="mt-3 rounded-2xl bg-indigo-50 border border-indigo-200 p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase text-indigo-800 tracking-wide">
                  <Globe className="h-3 w-3 text-indigo-600" />
                  Online Reservation
                </span>
                <span className="font-mono text-[10px] font-bold text-indigo-700">
                  {activeRes.reservationCode}
                </span>
              </div>
              <p className="font-bold text-stone-900">{activeRes.customerName}</p>
              <div className="flex items-center justify-between text-[11px] text-stone-600">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-stone-400" />
                  {new Date(activeRes.reservationAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span>{activeRes.guestCount} Guests</span>
              </div>
              {activeRes.status === 'confirmed' && (
                <button
                  onClick={() => handleUpdateReservationStatus(activeRes.id, 'completed')}
                  className="w-full mt-1.5 flex items-center justify-center gap-1 rounded-xl bg-indigo-600 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-xs"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  Seat Online Guest
                </button>
              )}
            </div>
          )}

          {/* Active Order Details if Occupied */}
          {isOccupied && activeOrder && (
            <div className="mt-3 rounded-2xl bg-white p-3 border border-rose-100 text-xs space-y-1">
              <div className="flex justify-between font-bold text-stone-800">
                <span>Order #{activeOrder.orderNumber.slice(-3)}</span>
                <span className="text-amber-800 font-mono">₱{activeOrder.totalAmount.toFixed(2)}</span>
              </div>
              <p className="text-[11px] text-stone-500">Guest: {activeOrder.customerName}</p>
              <p className="text-[10px] text-stone-400 line-clamp-1">
                Items: {activeOrder.items.map((i) => i.name).join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* Status Action Buttons */}
        <div className="mt-4 pt-3 border-t border-stone-200/60 flex items-center justify-between gap-1.5">
          {isAvailable && (
            <button
              onClick={() => handleTableStatusChange(table.id, 'occupied')}
              className="flex-1 rounded-xl bg-stone-900 py-1.5 text-xs font-bold text-white hover:bg-stone-800 transition shadow-xs active:scale-95"
            >
              Occupy Table
            </button>
          )}
          {isOccupied && (
            <button
              onClick={() => handleTableStatusChange(table.id, 'available')}
              className="flex-1 rounded-xl bg-emerald-600 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-xs active:scale-95"
            >
              Free Table
            </button>
          )}
          {isReserved && !activeRes && (
            <button
              onClick={() => handleTableStatusChange(table.id, 'occupied')}
              className="flex-1 rounded-xl bg-amber-500 py-1.5 text-xs font-bold text-stone-950 hover:bg-amber-400 transition shadow-xs active:scale-95"
            >
              Seat Guests
            </button>
          )}

          <select
            value={table.status}
            onChange={(e) => handleTableStatusChange(table.id, e.target.value as any)}
            className="rounded-xl border border-stone-300 bg-white px-2 py-1.5 text-[11px] text-stone-700 font-semibold focus:outline-none"
          >
            <option value="available">Set Avail</option>
            <option value="occupied">Set Occupied</option>
            <option value="reserved">Set Reserved</option>
            <option value="cleaning">Set Cleaning</option>
          </select>
        </div>
      </div>
    );
  };

  // Render a Single Online Reservation Card
  const renderReservationCard = (res: Reservation) => {
    const isPending = res.status === 'pending';
    const isConfirmed = res.status === 'confirmed';
    const isCompleted = res.status === 'completed';
    const isCancelled = res.status === 'cancelled';

    return (
      <div
        key={res.id}
        className={`flex flex-col justify-between rounded-3xl border bg-white p-5 shadow-xs transition hover:shadow-md ${
          isPending
            ? 'border-amber-300 ring-1 ring-amber-500/20'
            : isConfirmed
            ? 'border-indigo-300 ring-1 ring-indigo-500/20'
            : 'border-stone-200'
        }`}
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-extrabold text-indigo-950">
                {res.reservationCode}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700 border border-indigo-200">
                <Globe className="h-3 w-3" />
                Online Booking
              </span>
            </div>

            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                isConfirmed
                  ? 'bg-indigo-100 text-indigo-800'
                  : isPending
                  ? 'bg-amber-100 text-amber-800 animate-pulse'
                  : isCompleted
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-stone-100 text-stone-500'
              }`}
            >
              {res.status}
            </span>
          </div>

          {/* Customer & Guest Info */}
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-stone-900 text-sm">{res.customerName}</h4>
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                Table #{res.tableNumber || 1}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-stone-600">
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-stone-400" />
                {res.contactNumber}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-stone-400" />
                {res.guestCount} Guests
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-stone-700 pt-1">
              <Calendar className="h-3.5 w-3.5 text-indigo-600" />
              <span className="font-semibold">
                {new Date(res.reservationAt).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}{' '}
                at{' '}
                {new Date(res.reservationAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            {res.notes && (
              <div className="mt-2 rounded-xl bg-stone-50 p-2 text-[11px] text-stone-600 border border-stone-200">
                <p className="font-bold text-stone-700">Special Notes:</p>
                <p className="italic">"{res.notes}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
          {isPending && (
            <>
              <button
                onClick={() => handleUpdateReservationStatus(res.id, 'confirmed')}
                className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-indigo-600 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Confirm Table
              </button>
              <button
                onClick={() => handleUpdateReservationStatus(res.id, 'cancelled')}
                className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
              >
                Decline
              </button>
            </>
          )}

          {isConfirmed && (
            <>
              <button
                onClick={() => handleUpdateReservationStatus(res.id, 'completed')}
                className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-emerald-600 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-xs"
              >
                <UserCheck className="h-3.5 w-3.5" />
                Seat Guest
              </button>
              <button
                onClick={() => handleUpdateReservationStatus(res.id, 'cancelled')}
                className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
              >
                Cancel
              </button>
            </>
          )}

          {(isCompleted || isCancelled) && (
            <span className="text-[11px] text-stone-400 italic">
              Archived ({new Date(res.createdAt).toLocaleDateString()})
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-amber-700">
            Dining Room &amp; Reservations
          </span>
          <h2 className="font-display text-2xl font-extrabold text-stone-900">
            Table &amp; Reservation Management
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Separately manage On-the-Place Physical Floor Tables and Online Customer Reservations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsNewResModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-extrabold text-stone-950 shadow-xs hover:bg-amber-400 transition active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            Book Reservation
          </button>

          <button
            onClick={refreshData}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition active:scale-95"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Primary Section Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-stone-100/80 p-1.5 border border-stone-200">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setMainTab('all')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              mainTab === 'all'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-stone-500" />
            All Dining Operations
          </button>

          <button
            onClick={() => setMainTab('floor_tables')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              mainTab === 'floor_tables'
                ? 'bg-white text-amber-900 shadow-xs border-amber-300'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
            }`}
          >
            <Store className="h-3.5 w-3.5 text-amber-600" />
            On-the-Place Tables
            <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-extrabold text-amber-800">
              {tables.length} ({availableCount} Free)
            </span>
          </button>

          <button
            onClick={() => setMainTab('online_reservations')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              mainTab === 'online_reservations'
                ? 'bg-white text-indigo-900 shadow-xs border-indigo-300'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
            }`}
          >
            <Globe className="h-3.5 w-3.5 text-indigo-600" />
            Online Table Reservations
            <span className="rounded-full bg-indigo-100 px-1.5 py-0.2 text-[10px] font-extrabold text-indigo-800">
              {reservations.length}
            </span>
            {pendingOnlineResCount > 0 && (
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
            onClick={() => setMainTab(mainTab === 'split' ? 'all' : 'split')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              mainTab === 'split'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            <Columns className="h-3.5 w-3.5" />
            Dual Split View
          </button>
        </div>
      </div>

      {/* Sub-Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* If viewing tables or split */}
        {(mainTab === 'all' || mainTab === 'floor_tables') && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-stone-500 mr-1">Floor Area:</span>
            <button
              onClick={() => setSelectedArea('all')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                selectedArea === 'all'
                  ? 'bg-amber-500 text-stone-950 font-extrabold shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
              }`}
            >
              All Areas ({tables.length})
            </button>
            <button
              onClick={() => setSelectedArea('airconditioned')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                selectedArea === 'airconditioned'
                  ? 'bg-sky-600 text-white font-extrabold shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
              }`}
            >
              ❄️ AC Room ({tables.filter((t) => t.area === 'airconditioned').length})
            </button>
            <button
              onClick={() => setSelectedArea('normal')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                selectedArea === 'normal'
                  ? 'bg-amber-700 text-white font-extrabold shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
              }`}
            >
              🌿 Main Dining ({tables.filter((t) => t.area === 'normal').length})
            </button>
          </div>
        )}

        {/* If viewing reservations only */}
        {mainTab === 'online_reservations' && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-stone-500 mr-1">Booking Status:</span>
            {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((st) => (
              <button
                key={st}
                onClick={() => setResStatusFilter(st)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold capitalize transition ${
                  resStatusFilter === st
                    ? 'bg-indigo-600 text-white font-extrabold shadow-xs'
                    : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                }`}
              >
                {st} (
                {st === 'all'
                  ? reservations.length
                  : reservations.filter((r) => r.status === st).length}
                )
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative w-full sm:w-64 ml-auto">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search table, guest, code..."
            className="w-full rounded-xl border border-stone-300 bg-white pl-10 pr-4 py-2 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Content Layout based on selected tab */}
      {mainTab === 'split' ? (
        /* Dual Split View: Floor Tables on Left, Online Reservations on Right */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Physical Tables */}
          <div className="rounded-3xl border border-amber-200 bg-amber-50/40 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500 text-stone-950">
                  <Store className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">On-the-Place Floor Tables</h3>
                  <p className="text-[10px] text-stone-500">Live table occupancy &amp; seat status</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 font-bold text-[10px]">
                  {availableCount} Free
                </span>
                <span className="rounded-full bg-rose-100 text-rose-800 px-2 py-0.5 font-bold text-[10px]">
                  {occupiedCount} Occupied
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {filteredTables.map((t) => renderTableCard(t))}
            </div>
          </div>

          {/* Right Column: Online Reservations */}
          <div className="rounded-3xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-200/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-600 text-white">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">Online Table Reservations</h3>
                  <p className="text-[10px] text-stone-500">Customer web advance table bookings</p>
                </div>
              </div>
              <span className="rounded-full bg-indigo-200/80 px-2.5 py-0.5 text-xs font-extrabold text-indigo-900">
                {filteredReservations.length}
              </span>
            </div>

            {filteredReservations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-indigo-200 bg-white/70 p-8 text-center text-xs text-stone-500">
                No online reservations match current search.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReservations.map((res) => renderReservationCard(res))}
              </div>
            )}
          </div>
        </div>
      ) : mainTab === 'online_reservations' ? (
        /* Online Reservations Standalone Mode */
        <div>
          {filteredReservations.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-12 text-center text-xs text-stone-500">
              No online reservations found for this filter.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredReservations.map((res) => renderReservationCard(res))}
            </div>
          )}
        </div>
      ) : mainTab === 'floor_tables' ? (
        /* Floor Tables Standalone Mode */
        <div>
          {filteredTables.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-12 text-center text-xs text-stone-500">
              No tables found matching current search.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredTables.map((table) => renderTableCard(table))}
            </div>
          )}
        </div>
      ) : (
        /* 'All' Unified Mode: Shows Online Reservations Banner followed by Floor Plan */
        <div className="space-y-8">
          {/* Active Online Reservations Section */}
          <div className="rounded-3xl border border-indigo-200 bg-indigo-50/40 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-200/70 pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-600 text-white">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    Active Online Table Bookings
                  </h3>
                  <p className="text-xs text-stone-500">
                    Advance customer reservations booked online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-1 text-xs font-bold">
                  {pendingOnlineResCount} Pending Approval
                </span>
                <span className="rounded-full bg-indigo-100 text-indigo-800 px-2.5 py-1 text-xs font-bold">
                  {confirmedOnlineResCount} Confirmed
                </span>
              </div>
            </div>

            {reservations.length === 0 ? (
              <div className="rounded-2xl bg-white p-6 text-center text-xs text-stone-500">
                No active online reservations.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {reservations
                  .filter((r) => r.status === 'pending' || r.status === 'confirmed')
                  .slice(0, 6)
                  .map((res) => renderReservationCard(res))}
              </div>
            )}
          </div>

          {/* On-The-Place Floor Tables Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500 text-stone-950">
                  <Store className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    On-the-Place (Physical Floor Plan)
                  </h3>
                  <p className="text-xs text-stone-500">
                    Live table occupancy, seat capacity, and dining areas
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-600">
                  {availableCount} of {tables.length} Tables Available
                </span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredTables.map((table) => renderTableCard(table))}
            </div>
          </div>
        </div>
      )}

      {/* Staff Manual Table Reservation Modal */}
      {isNewResModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-display text-lg font-extrabold text-stone-900">
                  Book Table Reservation
                </h3>
                <p className="text-xs text-stone-500">Log advance booking for walk-in or phone guest</p>
              </div>
              <button
                onClick={() => setIsNewResModalOpen(false)}
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 transition"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaffReservation} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-stone-700">Guest Full Name *</label>
                <input
                  type="text"
                  required
                  value={newResForm.customerName}
                  onChange={(e) =>
                    setNewResForm({ ...newResForm, customerName: e.target.value })
                  }
                  placeholder="e.g. Maria Santos"
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700">Contact Number *</label>
                  <input
                    type="text"
                    required
                    value={newResForm.contactNumber}
                    onChange={(e) =>
                      setNewResForm({ ...newResForm, contactNumber: e.target.value })
                    }
                    placeholder="+63 9XX XXX XXXX"
                    className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700">Guest Count *</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={newResForm.guestCount}
                    onChange={(e) =>
                      setNewResForm({
                        ...newResForm,
                        guestCount: parseInt(e.target.value) || 1,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700">Select Table *</label>
                  <select
                    value={newResForm.tableId}
                    onChange={(e) =>
                      setNewResForm({
                        ...newResForm,
                        tableId: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none font-medium"
                  >
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        Table #{t.tableNumber} ({t.capacity} seats •{' '}
                        {t.area === 'airconditioned' ? 'AC Room' : 'Main Dining'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-stone-700">Date &amp; Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newResForm.reservationAt}
                    onChange={(e) =>
                      setNewResForm({ ...newResForm, reservationAt: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700">Special Notes / Requests</label>
                <textarea
                  rows={2}
                  value={newResForm.notes}
                  onChange={(e) => setNewResForm({ ...newResForm, notes: e.target.value })}
                  placeholder="e.g. High chair needed, anniversary dinner..."
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsNewResModalOpen(false)}
                  className="rounded-xl border border-stone-200 px-4 py-2 font-bold text-stone-600 hover:bg-stone-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 px-4 py-2 font-extrabold text-stone-950 hover:bg-amber-400 transition shadow-xs"
                >
                  Confirm &amp; Reserve Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
