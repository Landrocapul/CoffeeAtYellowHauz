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
  X,
  Edit3,
  Mail,
  Trash2,
  Coffee,
  Check,
} from 'lucide-react';

interface TableManagementProps {
  onSelectTableForOrder?: (tableNumber: number) => void;
  onViewOrderReceipt?: (order: Order) => void;
}

type StatusFilter = 'all' | 'available' | 'occupied' | 'reserved' | 'cleaning';
type AreaFilter = 'all' | 'normal' | 'airconditioned';

export const TableManagement: React.FC<TableManagementProps> = ({
  onSelectTableForOrder,
  onViewOrderReceipt,
}) => {
  const { showAlert, showConfirm } = useModal();
  const [tables, setTables] = useState<Table[]>(() => AppStore.getTables());
  const [reservations, setReservations] = useState<Reservation[]>(() =>
    AppStore.getReservations()
  );

  // Filters matching image.png
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [areaFilter, setAreaFilter] = useState<AreaFilter>('all');

  // Selected table for detailed reservation / contact drawer
  const [selectedTableForDetails, setSelectedTableForDetails] = useState<Table | null>(null);

  // New reservation / new table modals
  const [isNewResModalOpen, setIsNewResModalOpen] = useState(false);
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);

  // New reservation form state for staff manual entry
  const [newResForm, setNewResForm] = useState({
    customerName: '',
    contactNumber: '',
    guestCount: 2,
    tableId: 1,
    reservationAt: new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 16),
    notes: '',
  });

  // Quick book inside table details modal
  const [isQuickBooking, setIsQuickBooking] = useState(false);
  const [quickBookForm, setQuickBookForm] = useState({
    customerName: '',
    contactNumber: '',
    guestCount: 2,
    reservationAt: new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 16),
    notes: '',
  });

  const orders = AppStore.getOrders();

  const refreshData = () => {
    const freshTables = AppStore.getTables();
    setTables(freshTables);
    setReservations(AppStore.getReservations());
    if (selectedTableForDetails) {
      const updatedSelected = freshTables.find((t) => t.id === selectedTableForDetails.id);
      if (updatedSelected) {
        setSelectedTableForDetails(updatedSelected);
      }
    }
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
        title: 'Cancel Reservation?',
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
      if (res.tableId) {
        AppStore.updateTableStatus(res.tableId, 'occupied');
      }
      refreshData();
      showAlert({
        title: 'Guests Seated',
        message: `Guests for ${res.customerName} have been seated at Table #${res.tableNumber}. Table is now Occupied.`,
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

  // Helper to find active reservation for a table
  const getTableActiveReservation = (tableId: number): Reservation | undefined => {
    return reservations.find(
      (r) =>
        r.tableId === tableId &&
        (r.status === 'confirmed' || r.status === 'pending')
    );
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

  const handleQuickBookForTable = (e: React.FormEvent, table: Table) => {
    e.preventDefault();
    if (!quickBookForm.customerName.trim() || !quickBookForm.contactNumber.trim()) {
      showAlert({
        title: 'Missing Fields',
        message: 'Please provide guest name and contact number.',
        type: 'warning',
      });
      return;
    }

    AppStore.createReservation({
      tableId: table.id,
      tableNumber: table.tableNumber,
      customerId: null,
      customerName: quickBookForm.customerName.trim(),
      contactNumber: quickBookForm.contactNumber.trim(),
      guestCount: Number(quickBookForm.guestCount) || table.capacity,
      reservationAt: quickBookForm.reservationAt,
      notes: quickBookForm.notes.trim(),
    });

    const latest = AppStore.getReservations()[0];
    if (latest) {
      AppStore.updateReservationStatus(latest.id, 'confirmed');
    }

    refreshData();
    setIsQuickBooking(false);
    setQuickBookForm({
      customerName: '',
      contactNumber: '',
      guestCount: 2,
      reservationAt: new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 16),
      notes: '',
    });

    showAlert({
      title: 'Table Reserved',
      message: `Table #${table.tableNumber} is now reserved for ${quickBookForm.customerName}.`,
      type: 'success',
    });
  };

  // Filtered tables based on image.png filters
  const filteredTables = tables.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (areaFilter !== 'all' && t.area !== areaFilter) return false;
    return true;
  });

  // Table Card Renderer matching image.png
  const renderTableCard = (table: Table) => {
    const activeRes = getTableActiveReservation(table.id);
    const isAvailable = table.status === 'available';
    const isOccupied = table.status === 'occupied';
    const isReserved = table.status === 'reserved';
    const isCleaning = table.status === 'cleaning';

    const isLargeTable = table.capacity >= 6;
    const isExtraLargeTable = table.capacity >= 8;

    // Chair loops:
    // Top & bottom have 2 chairs each
    // Side chairs if capacity >= 6
    const hasSideChairs = isLargeTable;

    return (
      <div
        key={table.id}
        onClick={() => {
          setSelectedTableForDetails(table);
          setIsQuickBooking(false);
          setQuickBookForm({
            customerName: '',
            contactNumber: '',
            guestCount: table.capacity,
            reservationAt: new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 16),
            notes: '',
          });
        }}
        className="relative group cursor-pointer select-none transition-all duration-200 hover:-translate-y-1"
        style={{ minWidth: '220px', maxWidth: isExtraLargeTable ? '320px' : isLargeTable ? '280px' : '260px', width: '100%' }}
      >
        {/* Top Chairs */}
        <div className="absolute -top-3 left-0 right-0 flex justify-center gap-6 pointer-events-none z-0">
          <div className="w-10 sm:w-12 h-3.5 border-2 border-stone-300 bg-white/70 rounded-t-full transition-all group-hover:border-stone-400" />
          <div className="w-10 sm:w-12 h-3.5 border-2 border-stone-300 bg-white/70 rounded-t-full transition-all group-hover:border-stone-400" />
        </div>

        {/* Bottom Chairs */}
        <div className="absolute -bottom-3 left-0 right-0 flex justify-center gap-6 pointer-events-none z-0">
          <div className="w-10 sm:w-12 h-3.5 border-2 border-stone-300 bg-white/70 rounded-b-full transition-all group-hover:border-stone-400" />
          <div className="w-10 sm:w-12 h-3.5 border-2 border-stone-300 bg-white/70 rounded-b-full transition-all group-hover:border-stone-400" />
        </div>

        {/* Left Side Chairs (for 6 or 8 seaters) */}
        {hasSideChairs && (
          <div className="absolute -left-3 top-0 bottom-0 flex flex-col justify-center gap-4 pointer-events-none z-0">
            <div className="h-10 sm:h-12 w-3.5 border-2 border-stone-300 bg-white/70 rounded-l-full transition-all group-hover:border-stone-400" />
            {isExtraLargeTable && (
              <div className="h-10 sm:h-12 w-3.5 border-2 border-stone-300 bg-white/70 rounded-l-full transition-all group-hover:border-stone-400" />
            )}
          </div>
        )}

        {/* Right Side Chairs (for 6 or 8 seaters) */}
        {hasSideChairs && (
          <div className="absolute -right-3 top-0 bottom-0 flex flex-col justify-center gap-4 pointer-events-none z-0">
            <div className="h-10 sm:h-12 w-3.5 border-2 border-stone-300 bg-white/70 rounded-r-full transition-all group-hover:border-stone-400" />
            {isExtraLargeTable && (
              <div className="h-10 sm:h-12 w-3.5 border-2 border-stone-300 bg-white/70 rounded-r-full transition-all group-hover:border-stone-400" />
            )}
          </div>
        )}

        {/* Main Table Card */}
        <div
          className={`relative z-10 flex flex-col justify-between rounded-[28px] p-5 transition-all shadow-xs group-hover:shadow-lg ${
            isReserved
              ? 'bg-[#fef9c3] border-2 border-[#facc15]'
              : isOccupied
              ? 'bg-[#18181b] border-2 border-[#f5a524] text-white'
              : isCleaning
              ? 'bg-sky-50 border-2 border-sky-300'
              : 'bg-white border-2 border-stone-200/90'
          }`}
          style={{ minHeight: isExtraLargeTable ? '260px' : isLargeTable ? '230px' : '170px' }}
        >
          {/* Top Row: Table Badge & Timestamp if Occupied */}
          <div className="flex items-start justify-between">
            {/* Table Badge */}
            <div
              className={`grid h-8 w-8 place-items-center rounded-full text-xs font-extrabold ${
                isReserved
                  ? 'bg-[#facc15] text-stone-950 shadow-2xs'
                  : isOccupied
                  ? 'bg-[#f5a524] text-stone-950 shadow-2xs font-black'
                  : isCleaning
                  ? 'bg-sky-200 text-sky-950 font-bold'
                  : 'bg-stone-100 text-stone-700 font-bold'
              }`}
            >
              T{table.tableNumber}
            </div>

            {/* Occupied Timestamp */}
            {isOccupied && (
              <span className="font-mono text-xs font-bold text-[#f5a524] tracking-wide">
                12:03 PM
              </span>
            )}
          </div>

          {/* Center Info if Reserved or Occupied */}
          <div className="my-auto py-2">
            {isReserved && (
              <div className="space-y-0.5">
                <h4 className="font-serif text-base sm:text-lg font-bold text-stone-900 leading-tight">
                  {activeRes?.customerName || 'Reserved Guest'}
                </h4>
                <p className="text-xs text-stone-700 font-medium">
                  {activeRes?.guestCount || table.capacity} Guests
                </p>
              </div>
            )}

            {isOccupied && (
              <div className="space-y-0.5">
                <h4 className="font-serif text-base sm:text-lg font-bold text-white leading-tight">
                  Guest
                </h4>
                <p className="text-xs text-stone-400 font-medium">
                  {table.capacity} Guests
                </p>
              </div>
            )}

            {isCleaning && (
              <div className="space-y-0.5">
                <h4 className="font-serif text-sm font-bold text-sky-900">
                  Being Sanitized
                </h4>
                <p className="text-xs text-sky-700">Ready soon</p>
              </div>
            )}
          </div>

          {/* Bottom Row: Area Tag & Status Tag */}
          <div className="flex items-center justify-end gap-1.5 flex-wrap pt-2">
            {/* Area Tag */}
            <span
              className={`rounded-md px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
                isOccupied
                  ? 'bg-stone-800 border border-stone-700 text-stone-300'
                  : isReserved
                  ? 'bg-white/90 border border-stone-300 text-stone-700'
                  : 'bg-stone-50 border border-stone-200 text-stone-600'
              }`}
            >
              {table.area === 'airconditioned' ? 'AIRCONDITIONED' : 'NORMAL'}
            </span>

            {/* Status Tag */}
            <span
              className={`rounded-md px-2 py-0.5 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider ${
                isReserved
                  ? 'bg-stone-950 text-[#f5a524]'
                  : isOccupied
                  ? 'bg-stone-800 border border-[#f5a524]/40 text-[#f5a524]'
                  : isCleaning
                  ? 'bg-sky-200 text-sky-900 border border-sky-300'
                  : 'bg-stone-50 border border-stone-200 text-stone-600'
              }`}
            >
              {table.status}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header Bar matching image.png */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          {/* Left Title: TABLES */}
          <h1 className="font-serif text-2xl sm:text-3xl font-black tracking-wider text-stone-950 uppercase">
            TABLES
          </h1>

          {/* Filter Pill Group 1: Status (All, Available, Occupied, Reserved, Cleaning) */}
          <div className="inline-flex items-center rounded-full bg-white p-1 border border-stone-200/90 shadow-2xs">
            {(['all', 'available', 'occupied', 'reserved', 'cleaning'] as StatusFilter[]).map(
              (st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-full px-3.5 py-1 text-xs font-bold capitalize transition-all duration-150 ${
                    statusFilter === st
                      ? 'bg-stone-950 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-950 hover:bg-stone-50'
                  }`}
                >
                  {st === 'all' ? 'All' : st}
                </button>
              )
            )}
          </div>

          {/* Filter Pill Group 2: Area (All Areas, Normal, Airconditioned) */}
          <div className="inline-flex items-center rounded-full bg-white p-1 border border-stone-200/90 shadow-2xs">
            <button
              type="button"
              onClick={() => setAreaFilter('all')}
              className={`rounded-full px-3.5 py-1 text-xs font-bold transition-all duration-150 ${
                areaFilter === 'all'
                  ? 'bg-stone-950 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-950 hover:bg-stone-50'
              }`}
            >
              All Areas
            </button>
            <button
              type="button"
              onClick={() => setAreaFilter('normal')}
              className={`rounded-full px-3.5 py-1 text-xs font-bold transition-all duration-150 ${
                areaFilter === 'normal'
                  ? 'bg-stone-950 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-950 hover:bg-stone-50'
              }`}
            >
              Normal
            </button>
            <button
              type="button"
              onClick={() => setAreaFilter('airconditioned')}
              className={`rounded-full px-3.5 py-1 text-xs font-bold transition-all duration-150 ${
                areaFilter === 'airconditioned'
                  ? 'bg-stone-950 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-950 hover:bg-stone-50'
              }`}
            >
              Airconditioned
            </button>
          </div>
        </div>

        {/* Right Action: Add (+) Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsNewResModalOpen(true)}
            title="Book New Reservation"
            className="grid h-10 w-10 place-items-center rounded-xl bg-stone-950 text-amber-400 hover:bg-stone-800 transition active:scale-95 shadow-xs"
          >
            <Plus className="h-5 w-5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Floor Plan Canvas */}
      <div className="rounded-3xl border border-stone-200/80 bg-[#f7f7f7] p-6 sm:p-10 shadow-inner min-h-[520px]">
        {filteredTables.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white/80 p-12 text-center text-xs text-stone-500">
            No tables match the selected status or area filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-12 justify-items-center items-center">
            {filteredTables.map((table) => renderTableCard(table))}
          </div>
        )}
      </div>

      {/* Interactive Table & Reservation Details Modal */}
      {selectedTableForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 border border-stone-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`grid h-12 w-12 place-items-center rounded-2xl text-base font-black shadow-xs ${
                    selectedTableForDetails.status === 'reserved'
                      ? 'bg-[#facc15] text-stone-950'
                      : selectedTableForDetails.status === 'occupied'
                      ? 'bg-stone-900 text-[#f5a524]'
                      : selectedTableForDetails.status === 'cleaning'
                      ? 'bg-sky-200 text-sky-950'
                      : 'bg-stone-100 text-stone-800'
                  }`}
                >
                  T{selectedTableForDetails.tableNumber}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg sm:text-xl font-extrabold text-stone-900">
                      Table #{selectedTableForDetails.tableNumber}
                    </h3>
                    <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[10px] font-bold text-stone-600 uppercase">
                      {selectedTableForDetails.area === 'airconditioned'
                        ? '❄️ Airconditioned Room'
                        : '🌿 Normal / Main Dining'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {selectedTableForDetails.capacity} Guests Seating Capacity
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTableForDetails(null)}
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Status Pill Selector */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                Change Table Status:
              </span>
              <div className="grid grid-cols-4 gap-1.5 rounded-2xl bg-stone-100 p-1">
                {(['available', 'occupied', 'reserved', 'cleaning'] as Table['status'][]).map(
                  (st) => {
                    const isCurrent = selectedTableForDetails.status === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() =>
                          handleTableStatusChange(selectedTableForDetails.id, st)
                        }
                        className={`rounded-xl py-1.5 text-xs font-bold capitalize transition ${
                          isCurrent
                            ? st === 'available'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : st === 'occupied'
                              ? 'bg-stone-900 text-amber-400 shadow-xs'
                              : st === 'reserved'
                              ? 'bg-[#f5a524] text-stone-950 shadow-xs font-black'
                              : 'bg-sky-600 text-white shadow-xs'
                            : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                        }`}
                      >
                        {st}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* RESERVATION & CONTACT INFO DETAILS SECTION */}
            {(() => {
              const activeRes = getTableActiveReservation(selectedTableForDetails.id);

              if (activeRes) {
                return (
                  <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/50 p-4 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="grid h-7 w-7 place-items-center rounded-xl bg-amber-500 text-stone-950 font-bold">
                          <Globe className="h-4 w-4" />
                        </span>
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 block">
                            Active Reservation
                          </span>
                          <span className="font-mono text-xs font-bold text-amber-800">
                            {activeRes.reservationCode}
                          </span>
                        </div>
                      </div>
                      <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-amber-900">
                        {activeRes.status}
                      </span>
                    </div>

                    {/* Customer & Contact Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-stone-500 block text-[11px]">Guest Name:</span>
                        <span className="font-bold text-stone-900 text-sm">
                          {activeRes.customerName}
                        </span>
                      </div>

                      <div>
                        <span className="text-stone-500 block text-[11px]">Contact Info:</span>
                        <a
                          href={`tel:${activeRes.contactNumber}`}
                          className="font-bold text-indigo-700 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {activeRes.contactNumber}
                        </a>
                      </div>

                      <div>
                        <span className="text-stone-500 block text-[11px]">Reserved Schedule:</span>
                        <span className="font-bold text-stone-800 flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3.5 w-3.5 text-stone-400" />
                          {new Date(activeRes.reservationAt).toLocaleString([], {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>

                      <div>
                        <span className="text-stone-500 block text-[11px]">Party Size:</span>
                        <span className="font-bold text-stone-800 flex items-center gap-1 mt-0.5">
                          <Users className="h-3.5 w-3.5 text-stone-400" />
                          {activeRes.guestCount} Guests
                        </span>
                      </div>

                      {activeRes.notes && (
                        <div className="sm:col-span-2 rounded-xl bg-white p-2.5 border border-amber-200/80 text-[11px]">
                          <span className="font-bold text-stone-700 block">
                            Special Instructions:
                          </span>
                          <span className="italic text-stone-600">"{activeRes.notes}"</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-amber-200/70">
                      {activeRes.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateReservationStatus(activeRes.id, 'completed')
                          }
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-stone-950 py-2 text-xs font-bold text-amber-400 hover:bg-stone-800 transition shadow-xs"
                        >
                          <UserCheck className="h-4 w-4" />
                          Seat Guests Now
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateReservationStatus(activeRes.id, 'cancelled')
                        }
                        className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
                      >
                        Cancel Booking
                      </button>
                    </div>
                  </div>
                );
              }

              if (selectedTableForDetails.status === 'occupied') {
                const activeOrder = selectedTableForDetails.currentOrderId
                  ? orders.find((o) => o.id === selectedTableForDetails.currentOrderId)
                  : null;

                return (
                  <div className="rounded-2xl border border-stone-200 bg-stone-900 text-white p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                      <div className="flex items-center gap-2">
                        <Coffee className="h-4 w-4 text-amber-400" />
                        <span className="font-bold text-sm text-white">
                          Table is Currently Occupied
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold text-amber-400">
                        12:03 PM
                      </span>
                    </div>

                    {activeOrder ? (
                      <div className="text-xs space-y-1.5 bg-stone-800/80 p-3 rounded-xl border border-stone-700">
                        <div className="flex justify-between font-bold">
                          <span>Order #{activeOrder.orderNumber.slice(-3)}</span>
                          <span className="text-amber-400 font-mono">
                            ₱{activeOrder.totalAmount.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-stone-300">Guest: {activeOrder.customerName}</p>
                        <p className="text-[11px] text-stone-400">
                          Items: {activeOrder.items.map((i) => i.name).join(', ')}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-stone-400">
                        Dine-in guests are currently seated at this table.
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleTableStatusChange(selectedTableForDetails.id, 'available')
                        }
                        className="flex-1 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-xs"
                      >
                        Free Table (Mark Available)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleTableStatusChange(selectedTableForDetails.id, 'cleaning')
                        }
                        className="rounded-xl border border-stone-700 bg-stone-800 px-3 py-2 text-xs font-bold text-stone-300 hover:bg-stone-700 transition"
                      >
                        Set Cleaning
                      </button>
                    </div>
                  </div>
                );
              }

              // Table is available or cleaning with no active reservation
              return (
                <div className="space-y-3">
                  {!isQuickBooking ? (
                    <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/70 p-5 text-center space-y-3">
                      <p className="text-xs text-stone-600">
                        No active reservation on Table #{selectedTableForDetails.tableNumber}.
                      </p>

                      <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsQuickBooking(true)}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-stone-950 px-4 py-2 text-xs font-bold text-amber-400 hover:bg-stone-800 transition shadow-xs"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Book Reservation for this Table
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleTableStatusChange(
                              selectedTableForDetails.id,
                              'occupied'
                            )
                          }
                          className="w-full sm:w-auto rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-bold text-stone-800 hover:bg-stone-50 transition"
                        >
                          Seat Walk-in (Occupy)
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Quick Booking Form */
                    <form
                      onSubmit={(e) =>
                        handleQuickBookForTable(e, selectedTableForDetails)
                      }
                      className="rounded-2xl border border-amber-300 bg-amber-50/40 p-4 space-y-3 text-xs animate-in fade-in"
                    >
                      <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                        <span className="font-bold text-stone-900">
                          Book Table #{selectedTableForDetails.tableNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsQuickBooking(false)}
                          className="text-stone-400 hover:text-stone-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div>
                        <label className="font-bold text-stone-700">Guest Name *</label>
                        <input
                          type="text"
                          required
                          value={quickBookForm.customerName}
                          onChange={(e) =>
                            setQuickBookForm({
                              ...quickBookForm,
                              customerName: e.target.value,
                            })
                          }
                          placeholder="e.g. Maria Santos"
                          className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="font-bold text-stone-700">Contact Number *</label>
                          <input
                            type="text"
                            required
                            value={quickBookForm.contactNumber}
                            onChange={(e) =>
                              setQuickBookForm({
                                ...quickBookForm,
                                contactNumber: e.target.value,
                              })
                            }
                            placeholder="+63 9XX XXX XXXX"
                            className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-stone-700">Party Size *</label>
                          <input
                            type="number"
                            min={1}
                            max={selectedTableForDetails.capacity}
                            required
                            value={quickBookForm.guestCount}
                            onChange={(e) =>
                              setQuickBookForm({
                                ...quickBookForm,
                                guestCount: parseInt(e.target.value) || 1,
                              })
                            }
                            className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-stone-700">Reservation Date &amp; Time *</label>
                        <input
                          type="datetime-local"
                          required
                          value={quickBookForm.reservationAt}
                          onChange={(e) =>
                            setQuickBookForm({
                              ...quickBookForm,
                              reservationAt: e.target.value,
                            })
                          }
                          className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-stone-700">Notes / Requests</label>
                        <input
                          type="text"
                          value={quickBookForm.notes}
                          onChange={(e) =>
                            setQuickBookForm({
                              ...quickBookForm,
                              notes: e.target.value,
                            })
                          }
                          placeholder="e.g. Birthday dinner, high chair..."
                          className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsQuickBooking(false)}
                          className="rounded-xl border border-stone-200 px-3 py-1.5 font-bold text-stone-600 hover:bg-stone-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="rounded-xl bg-amber-500 px-4 py-1.5 font-bold text-stone-950 hover:bg-amber-400 shadow-xs"
                        >
                          Confirm Booking
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Book New Reservation Modal (from + button) */}
      {isNewResModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-display text-lg font-extrabold text-stone-900">
                  Book Table Reservation
                </h3>
                <p className="text-xs text-stone-500">Log advance booking with contact info</p>
              </div>
              <button
                onClick={() => setIsNewResModalOpen(false)}
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 transition"
              >
                <X className="h-5 w-5" />
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
                        {t.area === 'airconditioned' ? 'AC Room' : 'Normal'})
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

