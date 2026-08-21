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

  // New reservation / new table / edit table modals
  const [isNewResModalOpen, setIsNewResModalOpen] = useState(false);
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);
  const [isEditTableModalOpen, setIsEditTableModalOpen] = useState(false);
  const [tableToEdit, setTableToEdit] = useState<Table | null>(null);

  // New table form state
  const [newTableForm, setNewTableForm] = useState<{
    tableNumber: number;
    capacity: number;
    area: 'normal' | 'airconditioned';
    status: Table['status'];
  }>({
    tableNumber: 1,
    capacity: 4,
    area: 'normal',
    status: 'available',
  });

  // Edit table state
  const [isEditingTable, setIsEditingTable] = useState(false);
  const [editTableForm, setEditTableForm] = useState<{
    tableNumber: number;
    capacity: number;
    area: 'normal' | 'airconditioned';
    status: Table['status'];
  }>({
    tableNumber: 1,
    capacity: 4,
    area: 'normal',
    status: 'available',
  });

  // Dedicated Edit Table Modal form state
  const [editModalForm, setEditModalForm] = useState<{
    tableNumber: number;
    capacity: number;
    area: 'normal' | 'airconditioned';
    status: Table['status'];
  }>({
    tableNumber: 1,
    capacity: 4,
    area: 'normal',
    status: 'available',
  });

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

  const handleOpenAddTableModal = () => {
    const highestNum = tables.length ? Math.max(...tables.map((t) => t.tableNumber)) : 0;
    setNewTableForm({
      tableNumber: highestNum + 1,
      capacity: 4,
      area: areaFilter !== 'all' ? areaFilter : 'normal',
      status: 'available',
    });
    setIsAddTableModalOpen(true);
  };

  const handleAddTableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tableNum = Number(newTableForm.tableNumber);
    if (!tableNum || tableNum <= 0) {
      showAlert({
        title: 'Invalid Table Number',
        message: 'Please provide a valid positive table number.',
        type: 'warning',
      });
      return;
    }

    // Check if table number already exists
    if (tables.some((t) => t.tableNumber === tableNum)) {
      showAlert({
        title: 'Duplicate Table Number',
        message: `Table #${tableNum} already exists on the floor plan. Please use a different table number.`,
        type: 'warning',
      });
      return;
    }

    const created = AppStore.addTable({
      tableNumber: tableNum,
      capacity: Number(newTableForm.capacity) || 4,
      area: newTableForm.area,
      status: newTableForm.status,
    });

    refreshData();
    setIsAddTableModalOpen(false);

    showAlert({
      title: 'Table Added Successfully',
      message: `Table #${created.tableNumber} (${created.capacity} seats, ${
        created.area === 'airconditioned' ? 'Airconditioned Room' : 'Normal / Main Area'
      }) has been added to the floor plan.`,
      type: 'success',
    });
  };

  const handleDeleteTable = async (table: Table) => {
    if (table.status === 'occupied') {
      showAlert({
        title: 'Table Currently Occupied',
        message: `Table #${table.tableNumber} is currently occupied. Please clear the table before removing it.`,
        type: 'warning',
      });
      return;
    }

    const activeRes = getTableActiveReservation(table.id);
    if (activeRes) {
      showAlert({
        title: 'Active Reservation Exists',
        message: `Table #${table.tableNumber} has an active booking for ${activeRes.customerName}. Please cancel or complete the reservation before deleting the table.`,
        type: 'warning',
      });
      return;
    }

    const confirmed = await showConfirm({
      title: `Delete Table #${table.tableNumber}?`,
      message: `Are you sure you want to remove Table #${table.tableNumber} (${table.capacity} seats) from the floor plan? This will also remove it from customer online reservations.`,
      type: 'danger',
      confirmText: 'Delete Table',
      cancelText: 'Keep Table',
    });

    if (confirmed) {
      AppStore.deleteTable(table.id);
      setSelectedTableForDetails(null);
      setIsEditTableModalOpen(false);
      setTableToEdit(null);
      refreshData();
      showAlert({
        title: 'Table Removed',
        message: `Table #${table.tableNumber} was removed from the floor plan.`,
        type: 'info',
      });
    }
  };

  const handleOpenEditModal = (table: Table) => {
    setTableToEdit(table);
    setEditModalForm({
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      area: table.area,
      status: table.status,
    });
    setIsEditTableModalOpen(true);
  };

  const handleSaveEditModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableToEdit) return;

    const tableNum = Number(editModalForm.tableNumber);
    if (!tableNum || tableNum <= 0) {
      showAlert({
        title: 'Invalid Table Number',
        message: 'Please provide a valid positive table number.',
        type: 'warning',
      });
      return;
    }

    if (tableNum !== tableToEdit.tableNumber && tables.some((t) => t.tableNumber === tableNum && t.id !== tableToEdit.id)) {
      showAlert({
        title: 'Duplicate Table Number',
        message: `Table #${tableNum} already exists on the floor plan. Please choose a unique number.`,
        type: 'warning',
      });
      return;
    }

    const updated = AppStore.updateTable(tableToEdit.id, {
      tableNumber: tableNum,
      capacity: Number(editModalForm.capacity) || 4,
      area: editModalForm.area,
      status: editModalForm.status,
    });

    if (updated) {
      setIsEditTableModalOpen(false);
      setTableToEdit(null);
      if (selectedTableForDetails?.id === updated.id) {
        setSelectedTableForDetails(updated);
      }
      refreshData();
      showAlert({
        title: 'Table Updated',
        message: `Table #${updated.tableNumber} configuration updated successfully.`,
        type: 'success',
      });
    }
  };

  const handleStartEditingTable = (table: Table) => {
    setEditTableForm({
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      area: table.area,
      status: table.status,
    });
    setIsEditingTable(true);
  };

  const handleUpdateTableSubmit = (e: React.FormEvent, table: Table) => {
    e.preventDefault();
    const tableNum = Number(editTableForm.tableNumber);
    if (!tableNum || tableNum <= 0) {
      showAlert({
        title: 'Invalid Table Number',
        message: 'Please provide a valid positive table number.',
        type: 'warning',
      });
      return;
    }

    if (tableNum !== table.tableNumber && tables.some((t) => t.tableNumber === tableNum && t.id !== table.id)) {
      showAlert({
        title: 'Duplicate Table Number',
        message: `Table #${tableNum} already exists. Please choose a different number.`,
        type: 'warning',
      });
      return;
    }

    const updated = AppStore.updateTable(table.id, {
      tableNumber: tableNum,
      capacity: Number(editTableForm.capacity) || 4,
      area: editTableForm.area,
      status: editTableForm.status,
    });

    if (updated) {
      setSelectedTableForDetails(updated);
      setIsEditingTable(false);
      refreshData();
      showAlert({
        title: 'Table Updated',
        message: `Table #${updated.tableNumber} details updated successfully.`,
        type: 'success',
      });
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
              ? 'bg-amber-100/90 border-2 border-amber-300'
              : isOccupied
              ? 'bg-stone-900 border-2 border-amber-400 text-white'
              : isCleaning
              ? 'bg-sky-50 border-2 border-sky-300'
              : 'bg-white border-2 border-stone-200/90'
          }`}
          style={{ minHeight: isExtraLargeTable ? '260px' : isLargeTable ? '230px' : '170px' }}
        >
          {/* Top Row: Table Badge, Edit/Delete Action Icons, & Timestamp if Occupied */}
          <div className="flex items-start justify-between">
            {/* Table Badge */}
            <div
              className={`grid h-8 w-8 place-items-center rounded-full text-xs font-extrabold ${
                isReserved
                  ? 'bg-amber-300 text-stone-950 shadow-2xs font-bold'
                  : isOccupied
                  ? 'bg-amber-500 text-stone-950 shadow-2xs font-black'
                  : isCleaning
                  ? 'bg-sky-200 text-sky-950 font-bold'
                  : 'bg-stone-100 text-stone-700 font-bold'
              }`}
            >
              T{table.tableNumber}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Occupied Timestamp */}
              {isOccupied && (
                <span className="font-mono text-xs font-bold text-amber-400 tracking-wide mr-1">
                  12:03 PM
                </span>
              )}

              {/* Admin Quick Actions (Edit / Delete) */}
              <div className="flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-xs p-0.5 border border-stone-200 shadow-2xs">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEditModal(table);
                  }}
                  title={`Edit Table #${table.tableNumber}`}
                  className="grid h-6 w-6 place-items-center rounded-full text-stone-600 hover:bg-amber-100 hover:text-amber-900 transition active:scale-90"
                >
                  <Edit3 className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTable(table);
                  }}
                  title={`Delete Table #${table.tableNumber}`}
                  className="grid h-6 w-6 place-items-center rounded-full text-stone-400 hover:bg-rose-100 hover:text-rose-700 transition active:scale-90"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
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
                  ? 'bg-stone-950 text-amber-300'
                  : isOccupied
                  ? 'bg-stone-800 border border-amber-400/40 text-amber-300'
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

        {/* Right Actions: Add Table & New Booking */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenAddTableModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-black text-stone-950 hover:bg-amber-400 transition active:scale-95 shadow-xs"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Add Table</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewResModalOpen(true)}
            title="Book New Reservation"
            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-950 px-3.5 py-2 text-xs font-bold text-amber-400 hover:bg-stone-800 transition active:scale-95 shadow-xs"
          >
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">New Booking</span>
          </button>
        </div>
      </div>

      {/* Floor Plan Canvas */}
      <div className="rounded-3xl border border-stone-200/80 bg-[#f7f7f7] p-6 sm:p-10 shadow-inner min-h-[520px]">
        {filteredTables.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white/80 p-12 text-center text-xs text-stone-500 space-y-3">
            <p>No tables match the selected status or area filter.</p>
            <button
              type="button"
              onClick={handleOpenAddTableModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400"
            >
              <Plus className="h-4 w-4" />
              Add New Table to Floor Plan
            </button>
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
                      ? 'bg-amber-300 text-stone-950'
                      : selectedTableForDetails.status === 'occupied'
                      ? 'bg-stone-900 text-amber-400'
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

              <div className="flex items-center gap-1">
                {!isEditingTable && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleStartEditingTable(selectedTableForDetails)}
                      title="Edit Table Configuration"
                      className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTable(selectedTableForDetails)}
                      title="Delete Table"
                      className="rounded-full p-2 text-stone-400 hover:bg-rose-50 hover:text-rose-600 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTableForDetails(null);
                    setIsEditingTable(false);
                  }}
                  className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Inline Table Configuration Edit Form */}
            {isEditingTable ? (
              <form
                onSubmit={(e) => handleUpdateTableSubmit(e, selectedTableForDetails)}
                className="rounded-2xl bg-stone-50 border border-stone-200 p-4 space-y-3 text-xs"
              >
                <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                  <span className="font-bold text-stone-900 uppercase tracking-wider">
                    Edit Table Settings
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingTable(false)}
                    className="text-stone-500 hover:text-stone-800 underline"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Table Number</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={editTableForm.tableNumber}
                      onChange={(e) =>
                        setEditTableForm({ ...editTableForm, tableNumber: Number(e.target.value) })
                      }
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Seats Capacity</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      required
                      value={editTableForm.capacity}
                      onChange={(e) =>
                        setEditTableForm({ ...editTableForm, capacity: Number(e.target.value) })
                      }
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">Dining Area</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditTableForm({ ...editTableForm, area: 'normal' })}
                      className={`p-2 rounded-xl border text-center font-bold transition ${
                        editTableForm.area === 'normal'
                          ? 'border-amber-500 bg-amber-50 text-amber-900'
                          : 'border-stone-200 bg-white text-stone-600'
                      }`}
                    >
                      🌿 Main / Normal
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setEditTableForm({ ...editTableForm, area: 'airconditioned' })
                      }
                      className={`p-2 rounded-xl border text-center font-bold transition ${
                        editTableForm.area === 'airconditioned'
                          ? 'border-sky-500 bg-sky-50 text-sky-900'
                          : 'border-stone-200 bg-white text-stone-600'
                      }`}
                    >
                      ❄️ Airconditioned
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingTable(false)}
                    className="px-3 py-1.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-white font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-amber-500 text-stone-950 font-bold hover:bg-amber-400 shadow-xs"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            ) : null}

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
                              ? 'bg-amber-400 text-stone-950 shadow-xs font-black'
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

            {/* Admin Table Configuration Quick Actions in Details Modal */}
            <div className="flex items-center justify-between pt-3 border-t border-stone-200 text-xs">
              <button
                type="button"
                onClick={() => handleOpenEditModal(selectedTableForDetails)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 font-bold text-stone-700 hover:bg-stone-100 hover:text-stone-950 transition active:scale-95"
              >
                <Edit3 className="h-3.5 w-3.5 text-stone-600" />
                <span>Edit Table Settings</span>
              </button>

              <button
                type="button"
                onClick={() => handleDeleteTable(selectedTableForDetails)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/80 px-3.5 py-2 font-bold text-rose-700 hover:bg-rose-100 transition active:scale-95"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Table</span>
              </button>
            </div>
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

      {/* Add New Table Modal */}
      {isAddTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500 text-stone-950 font-black">
                  <Plus className="h-5 w-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-extrabold text-stone-900">
                    Add New Table
                  </h3>
                  <p className="text-xs text-stone-500">Configure table layout for floor plan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddTableModalOpen(false)}
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddTableSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Table Number *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-stone-400">
                    Table #
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    required
                    value={newTableForm.tableNumber}
                    onChange={(e) =>
                      setNewTableForm({
                        ...newTableForm,
                        tableNumber: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full rounded-xl border border-stone-300 bg-white py-2 pl-18 pr-3 text-sm font-bold text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-stone-400 mt-1">
                  Suggested sequential number is Table #{newTableForm.tableNumber}
                </p>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1.5">
                  Seating Capacity *
                </label>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {[2, 4, 6, 8].map((cap) => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => setNewTableForm({ ...newTableForm, capacity: cap })}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        newTableForm.capacity === cap
                          ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {cap} Guests
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-stone-500">Custom count:</span>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={newTableForm.capacity}
                    onChange={(e) =>
                      setNewTableForm({
                        ...newTableForm,
                        capacity: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-24 rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-[11px] text-stone-500">seats</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1.5">
                  Dining Area *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTableForm({ ...newTableForm, area: 'normal' })}
                    className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 ${
                      newTableForm.area === 'normal'
                        ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
                    }`}
                  >
                    <span className="text-xl">🌿</span>
                    <div>
                      <span className="font-bold text-stone-900 block text-xs">
                        Main Dining
                      </span>
                      <span className="text-[10px] text-stone-500">Standard / Normal</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setNewTableForm({ ...newTableForm, area: 'airconditioned' })
                    }
                    className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 ${
                      newTableForm.area === 'airconditioned'
                        ? 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-500/20'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
                    }`}
                  >
                    <span className="text-xl">❄️</span>
                    <div>
                      <span className="font-bold text-stone-900 block text-xs">
                        AC Room
                      </span>
                      <span className="text-[10px] text-stone-500">Airconditioned</span>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1.5">
                  Initial Status
                </label>
                <div className="grid grid-cols-4 gap-1.5 rounded-2xl bg-stone-100 p-1">
                  {(['available', 'occupied', 'reserved', 'cleaning'] as Table['status'][]).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setNewTableForm({ ...newTableForm, status: st })}
                        className={`rounded-xl py-1.5 text-xs font-bold capitalize transition ${
                          newTableForm.status === st
                            ? st === 'available'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : st === 'occupied'
                              ? 'bg-stone-900 text-amber-400 shadow-xs'
                              : st === 'reserved'
                              ? 'bg-amber-400 text-stone-950 shadow-xs font-black'
                              : 'bg-sky-600 text-white shadow-xs'
                            : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                        }`}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAddTableModalOpen(false)}
                  className="rounded-xl border border-stone-200 px-4 py-2 font-bold text-stone-600 hover:bg-stone-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 px-4 py-2 font-extrabold text-stone-950 hover:bg-amber-400 transition shadow-xs"
                >
                  Create &amp; Place Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Table Modal */}
      {isEditTableModalOpen && tableToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-stone-200 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500 text-stone-950 font-black">
                  <Edit3 className="h-5 w-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-extrabold text-stone-900">
                    Edit Table #{tableToEdit.tableNumber}
                  </h3>
                  <p className="text-xs text-stone-500">Update table number, seating, area &amp; status</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditTableModalOpen(false);
                  setTableToEdit(null);
                }}
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Visual Mini Preview of the Table */}
            <div className="rounded-2xl border border-stone-200/80 bg-stone-50 p-4 flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-3">
                Floor Plan Table Preview
              </span>
              <div className="relative py-2 px-6">
                {/* Top chairs */}
                <div className="flex justify-center gap-4 mb-1">
                  <div className="w-8 h-2.5 border-2 border-stone-300 bg-white rounded-t-full" />
                  <div className="w-8 h-2.5 border-2 border-stone-300 bg-white rounded-t-full" />
                </div>
                {/* Table shape */}
                <div
                  className={`px-6 py-3 rounded-2xl border-2 flex items-center justify-center gap-2 shadow-xs transition-all ${
                    editModalForm.status === 'reserved'
                      ? 'bg-amber-100/90 border-amber-300 text-stone-950'
                      : editModalForm.status === 'occupied'
                      ? 'bg-stone-900 border-amber-400 text-white'
                      : editModalForm.status === 'cleaning'
                      ? 'bg-sky-100 border-sky-300 text-sky-950'
                      : 'bg-white border-stone-200 text-stone-900'
                  }`}
                >
                  <span className="font-black text-sm">Table #{editModalForm.tableNumber}</span>
                  <span className="text-[11px] opacity-70">({editModalForm.capacity} seats)</span>
                </div>
                {/* Bottom chairs */}
                <div className="flex justify-center gap-4 mt-1">
                  <div className="w-8 h-2.5 border-2 border-stone-300 bg-white rounded-b-full" />
                  <div className="w-8 h-2.5 border-2 border-stone-300 bg-white rounded-b-full" />
                </div>
                {/* Side chairs if 6+ */}
                {editModalForm.capacity >= 6 && (
                  <>
                    <div className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-2 border-2 border-stone-300 bg-white rounded-l-full" />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-2 border-2 border-stone-300 bg-white rounded-r-full" />
                  </>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveEditModalSubmit} className="space-y-4 text-xs">
              {/* Table Number */}
              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Table Number *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-stone-400">
                    Table #
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    required
                    value={editModalForm.tableNumber}
                    onChange={(e) =>
                      setEditModalForm({
                        ...editModalForm,
                        tableNumber: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full rounded-xl border border-stone-300 bg-white py-2 pl-18 pr-3 text-sm font-bold text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Seating Capacity */}
              <div>
                <label className="font-bold text-stone-700 block mb-1.5">
                  Seating Capacity *
                </label>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {[2, 4, 6, 8].map((cap) => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => setEditModalForm({ ...editModalForm, capacity: cap })}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        editModalForm.capacity === cap
                          ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {cap} Guests
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-stone-500">Custom capacity:</span>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={editModalForm.capacity}
                    onChange={(e) =>
                      setEditModalForm({
                        ...editModalForm,
                        capacity: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-24 rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-[11px] text-stone-500">seats</span>
                </div>
              </div>

              {/* Dining Area */}
              <div>
                <label className="font-bold text-stone-700 block mb-1.5">
                  Dining Area *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditModalForm({ ...editModalForm, area: 'normal' })}
                    className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 ${
                      editModalForm.area === 'normal'
                        ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
                    }`}
                  >
                    <span className="text-xl">🌿</span>
                    <div>
                      <span className="font-bold text-stone-900 block text-xs">
                        Main Dining
                      </span>
                      <span className="text-[10px] text-stone-500">Standard / Normal</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEditModalForm({ ...editModalForm, area: 'airconditioned' })
                    }
                    className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 ${
                      editModalForm.area === 'airconditioned'
                        ? 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-500/20'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
                    }`}
                  >
                    <span className="text-xl">❄️</span>
                    <div>
                      <span className="font-bold text-stone-900 block text-xs">
                        AC Studio Lounge
                      </span>
                      <span className="text-[10px] text-stone-500">Airconditioned</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="font-bold text-stone-700 block mb-1.5">
                  Table Status
                </label>
                <div className="grid grid-cols-4 gap-1.5 rounded-2xl bg-stone-100 p-1">
                  {(['available', 'occupied', 'reserved', 'cleaning'] as Table['status'][]).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setEditModalForm({ ...editModalForm, status: st })}
                        className={`rounded-xl py-1.5 text-xs font-bold capitalize transition ${
                          editModalForm.status === st
                            ? st === 'available'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : st === 'occupied'
                              ? 'bg-stone-900 text-amber-400 shadow-xs'
                              : st === 'reserved'
                              ? 'bg-amber-400 text-stone-950 shadow-xs font-black'
                              : 'bg-sky-600 text-white shadow-xs'
                            : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                        }`}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="mt-4 flex items-center justify-between pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => handleDeleteTable(tableToEdit)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Table</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditTableModalOpen(false);
                      setTableToEdit(null);
                    }}
                    className="rounded-xl border border-stone-200 px-4 py-2 font-bold text-stone-600 hover:bg-stone-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-amber-500 px-4 py-2 font-extrabold text-stone-950 hover:bg-amber-400 transition shadow-xs"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

