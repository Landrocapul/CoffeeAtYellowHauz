import React, { useState, useEffect } from 'react';
import { Table, CustomerAccount, Reservation, StoreSettings } from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
import {
  X,
  Calendar,
  Clock,
  Users,
  User as UserIcon,
  Phone,
  CheckCircle2,
  ShieldCheck,
  Lock,
  LogIn,
  Sparkles,
  MapPin,
  Coffee,
  Check,
  ChevronRight,
} from 'lucide-react';

interface TableReservationModalProps {
  table: Table | null;
  settings: StoreSettings;
  activeCustomer: CustomerAccount | null;
  onClose: () => void;
  onReservationSuccess: (res: Reservation) => void;
  onRequireLogin?: () => void;
  onNavigateAccount?: () => void;
}

export const TableReservationModal: React.FC<TableReservationModalProps> = ({
  table,
  settings,
  activeCustomer,
  onClose,
  onReservationSuccess,
  onRequireLogin,
  onNavigateAccount,
}) => {
  const { showAlert } = useModal();

  // Form State
  const [customerName, setCustomerName] = useState(activeCustomer?.fullName || '');
  const [contactNumber, setContactNumber] = useState(activeCustomer?.contactNumber || '');
  const [guestCount, setGuestCount] = useState<number>(table?.capacity || 2);
  const [date, setDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [timeSlot, setTimeSlot] = useState<string>('14:00');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedReservation, setConfirmedReservation] = useState<Reservation | null>(null);

  // Sync activeCustomer if changed
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

  // Adjust guestCount when table changes
  useEffect(() => {
    if (table) {
      setGuestCount(Math.min(2, table.capacity));
    }
  }, [table]);

  if (!table) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Mandatory Customer Sign In Check
    if (!activeCustomer) {
      showAlert({
        title: 'Sign In Required',
        message: 'Please sign in or register a customer account before confirming your table reservation.',
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
        message: 'Please provide your full name and contact number for this booking.',
        type: 'warning',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const reservationAt = `${date}T${timeSlot}:00`;

      const newRes = AppStore.createReservation({
        bookingType: 'table',
        tableId: table.id,
        tableNumber: table.tableNumber,
        customerId: activeCustomer.id,
        customerName: customerName.trim(),
        contactNumber: contactNumber.trim(),
        guestCount,
        reservationAt,
        notes: notes.trim() || undefined,
      });

      setConfirmedReservation(newRes);
      onReservationSuccess(newRes);
    } catch (err) {
      showAlert({
        title: 'Booking Error',
        message: 'Failed to create reservation. Please try again.',
        type: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAircon = table.area === 'airconditioned';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200 customer-mode font-baskerville">
      <div className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-stone-200 overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className={`p-6 border-b ${isAircon ? 'bg-gradient-to-r from-sky-50 via-cyan-50 to-white border-sky-100' : 'bg-gradient-to-r from-amber-50 via-orange-50 to-white border-amber-100'} flex items-start justify-between`}>
          <div className="flex items-center gap-3.5">
            <div className={`grid h-12 w-12 place-items-center rounded-2xl font-black text-base shadow-sm ${
              isAircon ? 'bg-sky-500 text-white ring-4 ring-sky-100' : 'bg-amber-500 text-stone-950 ring-4 ring-amber-100'
            }`}>
              T{table.tableNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-extrabold text-stone-900">
                  Reserve Table #{table.tableNumber}
                </h2>
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  isAircon ? 'bg-sky-100 text-sky-800 border border-sky-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {isAircon ? '❄️ AC Room' : '🌿 Main Dining'}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-2 font-medium">
                <span>Capacity: Up to {table.capacity} Guests</span>
                <span>•</span>
                <span>{isAircon ? 'Cool, quiet study & private lounge' : 'Vibrant cafe & garden view'}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        {confirmedReservation ? (
          /* Confirmation Success Screen */
          <div className="p-6 sm:p-8 text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700 mx-auto shadow-inner">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Reservation Confirmed
              </span>
              <h3 className="text-2xl font-bold font-display text-stone-900 mt-1">
                We've Saved Table #{table.tableNumber} For You!
              </h3>
              <p className="text-xs text-stone-600 mt-1">
                A booking record has been created at Yellow Hauz.
              </p>

              <div className="mt-4 inline-block rounded-2xl bg-amber-50 border border-amber-200 px-6 py-2.5 shadow-xs">
                <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider block">
                  Confirmation Code
                </span>
                <span className="font-mono text-2xl font-black text-amber-900">
                  {confirmedReservation.reservationCode}
                </span>
              </div>
            </div>

            {/* Summary Details */}
            <div className="grid grid-cols-2 gap-3 text-left text-xs bg-stone-50 p-4 rounded-2xl border border-stone-200">
              <div>
                <span className="text-stone-400 block font-medium">Guest Name:</span>
                <span className="font-bold text-stone-900">{confirmedReservation.customerName}</span>
              </div>
              <div>
                <span className="text-stone-400 block font-medium">Phone Number:</span>
                <span className="font-bold text-stone-900">{confirmedReservation.contactNumber}</span>
              </div>
              <div>
                <span className="text-stone-400 block font-medium">Date &amp; Time:</span>
                <span className="font-bold text-stone-900">
                  {new Date(confirmedReservation.reservationAt).toLocaleString('en-PH', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block font-medium">Party Size:</span>
                <span className="font-bold text-stone-900">
                  {confirmedReservation.guestCount} {confirmedReservation.guestCount === 1 ? 'Guest' : 'Guests'} (Table #{confirmedReservation.tableNumber})
                </span>
              </div>
              {confirmedReservation.notes && (
                <div className="col-span-2 pt-2 border-t border-stone-200">
                  <span className="text-stone-400 block font-medium">Special Request:</span>
                  <span className="italic text-stone-700">{confirmedReservation.notes}</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
              {onNavigateAccount && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateAccount();
                  }}
                  className="rounded-xl bg-stone-950 px-6 py-3 text-xs font-bold text-amber-400 hover:bg-stone-800 transition"
                >
                  View in My Account
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-amber-500 px-6 py-3 text-xs font-black text-stone-950 hover:bg-amber-400 transition"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Reservation Input Form */
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
            {/* Account Status Badge */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-200">
              <div className="flex items-center gap-2.5">
                <div className={`grid h-8 w-8 place-items-center rounded-xl text-xs font-bold ${
                  activeCustomer ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                }`}>
                  {activeCustomer ? <ShieldCheck className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                </div>
                <div className="text-xs">
                  <span className="font-bold text-stone-900 block">
                    {activeCustomer ? activeCustomer.fullName : 'Guest Booking (Sign-In Required)'}
                  </span>
                  <span className="text-stone-500">
                    {activeCustomer ? activeCustomer.email || activeCustomer.contactNumber : 'Sign in to confirm your table'}
                  </span>
                </div>
              </div>

              {!activeCustomer ? (
                <button
                  type="button"
                  onClick={onRequireLogin}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-stone-950 shadow-xs hover:bg-amber-400 transition shrink-0"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Sign In
                </button>
              ) : (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                  Verified
                </span>
              )}
            </div>

            {/* Date & Time Selection */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Reservation Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-2.5 h-4 w-4 text-stone-400" />
                  <input
                    type="date"
                    required
                    value={date}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 pl-10 pr-3 py-2.5 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Time Slot
                </label>
                <div className="relative">
                  <Clock className="absolute left-3.5 top-2.5 h-4 w-4 text-stone-400" />
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 pl-10 pr-3 py-2.5 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none"
                  >
                    <option value="08:00">08:00 AM (Morning Coffee &amp; Breakfast)</option>
                    <option value="10:00">10:00 AM (Brunch &amp; Pastry)</option>
                    <option value="12:00">12:00 PM (Lunch Rush)</option>
                    <option value="14:00">02:00 PM (Afternoon Merienda)</option>
                    <option value="16:00">04:00 PM (Coffee &amp; Study)</option>
                    <option value="18:00">06:00 PM (Dinner Hour)</option>
                    <option value="20:00">08:00 PM (Evening Chill)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Guest Count & Customer Info */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Number of Guests
                </label>
                <div className="relative">
                  <Users className="absolute left-3.5 top-2.5 h-4 w-4 text-stone-400" />
                  <select
                    value={guestCount}
                    onChange={(e) => setGuestCount(Number(e.target.value))}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 pl-10 pr-3 py-2.5 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none"
                  >
                    {Array.from({ length: table.capacity }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'Guest' : 'Guests'} (Max {table.capacity})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-2.5 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Maria Santos"
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 pl-10 pr-3 py-2.5 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Contact Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-2.5 h-4 w-4 text-stone-400" />
                <input
                  type="tel"
                  required
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="+63 917 123 4567"
                  className="w-full rounded-xl border border-stone-300 bg-stone-50 pl-10 pr-3 py-2.5 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Special Occasion / Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Birthday celebration, quiet corner for business meeting, high chair requested"
                className="w-full rounded-xl border border-stone-300 bg-stone-50 p-3 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2">
              {activeCustomer ? (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-2xl bg-amber-500 py-3.5 text-sm font-extrabold text-stone-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 active:scale-[0.99] transition flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isSubmitting ? 'Confirming Booking...' : `Confirm Reservation for Table #${table.tableNumber}`}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    showAlert({
                      title: 'Sign In Required',
                      message: 'Please sign in or create an account to finalize and secure your reservation.',
                      type: 'warning',
                    });
                    if (onRequireLogin) onRequireLogin();
                  }}
                  className="w-full rounded-2xl bg-stone-950 py-3.5 text-sm font-extrabold text-amber-400 shadow-md hover:bg-stone-800 active:scale-[0.99] transition flex items-center justify-center gap-2"
                >
                  <Lock className="h-4 w-4 text-amber-400" />
                  Sign In to Confirm Reservation
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
