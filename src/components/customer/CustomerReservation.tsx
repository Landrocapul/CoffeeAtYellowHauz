import React, { useState, useMemo, useEffect } from 'react';
import { Reservation, CustomerAccount, Table, StoreSettings } from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  CheckCircle,
  Sparkles,
  AlertCircle,
  Phone,
  User as UserIcon,
  Lock,
  ShieldCheck,
  LogIn,
} from 'lucide-react';

interface CustomerReservationProps {
  settings: StoreSettings;
  activeCustomer: CustomerAccount | null;
  onReservationSuccess: (res: Reservation) => void;
  onRequireLogin?: () => void;
}

export const CustomerReservation: React.FC<CustomerReservationProps> = ({
  settings,
  activeCustomer,
  onReservationSuccess,
  onRequireLogin,
}) => {
  const { showAlert } = useModal();
  const tables = useMemo(() => AppStore.getTables(), []);

  // Reservation form state
  const [customerName, setCustomerName] = useState(activeCustomer?.fullName || '');
  const [contactNumber, setContactNumber] = useState(activeCustomer?.contactNumber || '');
  const [guestCount, setGuestCount] = useState<number>(2);
  const [selectedArea, setSelectedArea] = useState<'all' | 'airconditioned' | 'normal'>('all');
  const [selectedTableId, setSelectedTableId] = useState<number | ''>('');
  const [date, setDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [timeSlot, setTimeSlot] = useState<string>('14:00');
  const [notes, setNotes] = useState('');
  const [confirmedReservation, setConfirmedReservation] = useState<Reservation | null>(null);

  // Automatically sync customer details if activeCustomer changes
  useEffect(() => {
    if (activeCustomer) {
      if (!customerName || customerName.trim() === '') {
        setCustomerName(activeCustomer.fullName);
      }
      if (!contactNumber || contactNumber.trim() === '') {
        setContactNumber(activeCustomer.contactNumber || '');
      }
    }
  }, [activeCustomer]);

  // Available matching tables
  const availableTables = useMemo(() => {
    return tables.filter((t) => {
      if (selectedArea !== 'all' && t.area !== selectedArea) return false;
      if (t.capacity < guestCount) return false;
      return true;
    });
  }, [tables, selectedArea, guestCount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Mandatory Customer Sign In Check
    if (!activeCustomer) {
      showAlert({
        title: 'Sign In Required',
        message: 'You must sign in or register a customer account before confirming your table reservation.',
        type: 'warning',
      });
      if (onRequireLogin) {
        onRequireLogin();
      }
      return;
    }

    if (!customerName.trim() || !contactNumber.trim()) {
      showAlert({
        title: 'Information Required',
        message: 'Please provide your full name and contact number for this reservation.',
        type: 'warning',
      });
      return;
    }
    if (!selectedTableId) {
      showAlert({
        title: 'Table Required',
        message: 'Please select a dining table for your booking.',
        type: 'warning',
      });
      return;
    }

    const tableObj = tables.find((t) => t.id === Number(selectedTableId));
    const reservationAt = `${date}T${timeSlot}:00`;

    const newRes = AppStore.createReservation({
      tableId: Number(selectedTableId),
      tableNumber: tableObj?.tableNumber,
      customerId: activeCustomer.id,
      customerName: customerName.trim(),
      contactNumber: contactNumber.trim(),
      guestCount,
      reservationAt,
      notes: notes.trim() || undefined,
    });

    setConfirmedReservation(newRes);
    onReservationSuccess(newRes);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-200 px-3.5 py-1 text-xs font-extrabold uppercase tracking-widest text-amber-800">
          <Sparkles className="h-3.5 w-3.5" />
          Table Booking
        </span>
        <h1 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold text-stone-900">
          Reserve a Table at Yellow Hauz
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-stone-600 leading-relaxed">
          Planning a coffee date, family gathering, study group, or meeting? Reserve your preferred table in our cozy airconditioned room or breezy garden area.
        </p>
      </div>

      {confirmedReservation ? (
        /* Confirmation Success Box */
        <div className="rounded-3xl border border-emerald-200 bg-white p-8 shadow-xl text-center space-y-5 animate-in fade-in zoom-in duration-200">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700 mx-auto">
            <CheckCircle className="h-8 w-8" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Reservation Submitted Successfully
            </span>
            <h2 className="text-2xl font-bold font-display text-stone-900 mt-1">
              We Look Forward to Welcoming You!
            </h2>
            <div className="mt-3 inline-block rounded-2xl bg-amber-50 border border-amber-200 px-5 py-2">
              <span className="text-xs text-stone-500 font-bold uppercase tracking-wider block">
                Your Confirmation Code
              </span>
              <span className="font-mono text-xl font-extrabold text-amber-900">
                {confirmedReservation.reservationCode}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 max-w-lg mx-auto text-left text-xs bg-stone-50 p-4 rounded-2xl border border-stone-200">
            <div>
              <span className="text-stone-500 block">Name:</span>
              <span className="font-bold text-stone-800">{confirmedReservation.customerName}</span>
            </div>
            <div>
              <span className="text-stone-500 block">Contact:</span>
              <span className="font-bold text-stone-800">{confirmedReservation.contactNumber}</span>
            </div>
            <div>
              <span className="text-stone-500 block">Date &amp; Time:</span>
              <span className="font-bold text-stone-800">
                {new Date(confirmedReservation.reservationAt).toLocaleString('en-PH', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
            <div>
              <span className="text-stone-500 block">Table:</span>
              <span className="font-bold text-stone-800">
                Table #{confirmedReservation.tableNumber} ({confirmedReservation.guestCount} Guests)
              </span>
            </div>
            {confirmedReservation.notes && (
              <div className="sm:col-span-2 pt-2 border-t border-stone-200">
                <span className="text-stone-500 block">Special Requests:</span>
                <span className="italic text-stone-700">{confirmedReservation.notes}</span>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              onClick={() => setConfirmedReservation(null)}
              className="rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-bold text-stone-950 hover:bg-amber-400 transition"
            >
              Book Another Table
            </button>
          </div>
        </div>
      ) : (
        /* Reservation Form */
        <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="font-display text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">
                1. Reservation Details
              </h3>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-2.5 h-4 w-4 text-stone-400" />
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 bg-stone-50 pl-10 pr-4 py-2 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Time Slot
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3.5 top-2.5 h-4 w-4 text-stone-400" />
                    <select
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 bg-stone-50 pl-10 pr-4 py-2 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="08:00">8:00 AM (Morning Coffee &amp; Breakfast)</option>
                      <option value="10:00">10:00 AM (Brunch)</option>
                      <option value="12:00">12:00 PM (Lunch)</option>
                      <option value="14:00">2:00 PM (Afternoon Merienda)</option>
                      <option value="16:00">4:00 PM (Coffee &amp; Pastry)</option>
                      <option value="18:00">6:00 PM (Dinner)</option>
                      <option value="20:00">8:00 PM (Evening Chill)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Number of Guests
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3.5 top-2.5 h-4 w-4 text-stone-400" />
                    <select
                      value={guestCount}
                      onChange={(e) => setGuestCount(Number(e.target.value))}
                      className="w-full rounded-xl border border-stone-300 bg-stone-50 pl-10 pr-4 py-2 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <option key={n} value={n}>
                          {n} {n === 1 ? 'Guest' : 'Guests'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Preferred Area
                  </label>
                  <select
                    value={selectedArea}
                    onChange={(e) => setSelectedArea(e.target.value as any)}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-2 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="all">Any Available Area</option>
                    <option value="airconditioned">❄️ Airconditioned Dining Room</option>
                    <option value="normal">🌿 Main Open-Air / Normal Area</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  Choose Table on Floor Plan
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-[#f7f7f7] rounded-2xl border border-stone-200/90 max-h-64 overflow-y-auto">
                  {availableTables.map((t) => {
                    const isSelected = selectedTableId === t.id;
                    const isOccupied = t.status === 'occupied';
                    const isReserved = t.status === 'reserved';

                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTableId(t.id)}
                        className={`relative p-3 rounded-2xl border-2 text-left transition-all duration-150 flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-100/80 border-amber-500 shadow-xs ring-2 ring-amber-500/20'
                            : isReserved
                            ? 'bg-[#fef9c3] border-[#facc15] hover:border-amber-400'
                            : isOccupied
                            ? 'bg-stone-900 border-stone-700 text-white'
                            : 'bg-white border-stone-200 hover:border-stone-400'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span
                            className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${
                              isSelected
                                ? 'bg-amber-500 text-stone-950'
                                : isReserved
                                ? 'bg-[#facc15] text-stone-950'
                                : isOccupied
                                ? 'bg-[#f5a524] text-stone-950'
                                : 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            T{t.tableNumber}
                          </span>
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              isOccupied
                                ? 'bg-stone-800 text-stone-300'
                                : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            {t.capacity} Seats
                          </span>
                        </div>

                        <div className="mt-2 text-[10px] font-semibold truncate">
                          <span
                            className={
                              isOccupied
                                ? 'text-stone-300'
                                : isSelected
                                ? 'text-amber-900 font-bold'
                                : 'text-stone-600'
                            }
                          >
                            {t.area === 'airconditioned' ? '❄️ AC Room' : '🌿 Main Dining'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <h3 className="font-display text-lg font-bold text-stone-900">
                    2. Customer Account &amp; Contact
                  </h3>
                  {activeCustomer ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Signed In
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
                      <Lock className="h-3 w-3" />
                      Sign In Required
                    </span>
                  )}
                </div>

                {!activeCustomer ? (
                  <div className="mt-3 rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500 text-stone-950 shrink-0 shadow-xs">
                          <Lock className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wide">
                            Sign In Mandatory for Reservations
                          </h4>
                          <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                            Please sign in or create an account to confirm and secure your table booking.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onRequireLogin}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-black text-stone-950 shadow-xs hover:bg-amber-400 active:scale-95 transition shrink-0"
                      >
                        <LogIn className="h-4 w-4" />
                        Sign In / Register
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-200 text-emerald-900 font-bold text-xs">
                        {activeCustomer.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-xs">
                        <span className="font-bold text-stone-900 block">{activeCustomer.fullName}</span>
                        <span className="text-stone-500">{activeCustomer.email || activeCustomer.contactNumber}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onRequireLogin}
                      className="text-[11px] font-bold text-stone-600 hover:text-stone-900 underline"
                    >
                      Switch Account
                    </button>
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Full Name {activeCustomer && <span className="text-emerald-600">*</span>}
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-2.5 h-4 w-4 text-stone-400" />
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Atty. Roberto Tan"
                      className="w-full rounded-xl border border-stone-300 bg-stone-50 pl-10 pr-4 py-2 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Phone Number {activeCustomer && <span className="text-emerald-600">*</span>}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-2.5 h-4 w-4 text-stone-400" />
                    <input
                      type="tel"
                      required
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      placeholder="+63 917 123 4567"
                      className="w-full rounded-xl border border-stone-300 bg-stone-50 pl-10 pr-4 py-2 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Special Notes / Occasion
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Birthday cake presentation, quiet corner for business meeting, high chair needed"
                  className="w-full rounded-xl border border-stone-300 bg-stone-50 p-3 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {activeCustomer ? (
                <button
                  type="submit"
                  className="w-full rounded-xl bg-amber-500 py-3.5 text-sm font-extrabold text-stone-950 shadow-md hover:bg-amber-400 active:scale-[0.99] transition flex items-center justify-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Confirm &amp; Book Table
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    showAlert({
                      title: 'Sign In Required',
                      message: 'Please sign in or register to complete and confirm your table reservation.',
                      type: 'warning',
                    });
                    if (onRequireLogin) onRequireLogin();
                  }}
                  className="w-full rounded-xl bg-stone-900 py-3.5 text-sm font-extrabold text-amber-400 shadow-md hover:bg-stone-800 active:scale-[0.99] transition flex items-center justify-center gap-2"
                >
                  <Lock className="h-4 w-4 text-amber-400" />
                  Sign In to Confirm Reservation
                </button>
              )}
            </form>
          </div>

          {/* Table Guide & Layout Preview */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
              <h3 className="font-display text-base font-bold text-stone-900 mb-3">
                Dining Areas Overview
              </h3>

              <div className="space-y-3 text-xs">
                <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
                  <div className="flex items-center justify-between font-bold text-sky-900 mb-1">
                    <span>❄️ Airconditioned Room</span>
                    <span className="text-[10px] bg-sky-200 px-2 py-0.5 rounded-full">Tables 5 - 8</span>
                  </div>
                  <p className="text-stone-600 leading-relaxed">
                    Cool and quiet, ideal for work sessions, executive meetings, or warm afternoon coffee dates.
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                  <div className="flex items-center justify-between font-bold text-amber-900 mb-1">
                    <span>🌿 Main Dining &amp; Garden</span>
                    <span className="text-[10px] bg-amber-200 px-2 py-0.5 rounded-full">Tables 1 - 4</span>
                  </div>
                  <p className="text-stone-600 leading-relaxed">
                    Bright, airy, and vibrant café atmosphere with garden views and easy counter access.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs text-xs text-stone-600 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  Reservations are held for up to 15 minutes past the booking time. If running late, please call us at {settings.shop_phone}.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
