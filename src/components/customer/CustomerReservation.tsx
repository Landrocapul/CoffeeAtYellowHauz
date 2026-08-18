import React, { useState, useMemo } from 'react';
import { Reservation, CustomerAccount, Table, StoreSettings } from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
import { Calendar, Clock, Users, MapPin, CheckCircle, Sparkles, AlertCircle, Phone, User as UserIcon } from 'lucide-react';

interface CustomerReservationProps {
  settings: StoreSettings;
  activeCustomer: CustomerAccount | null;
  onReservationSuccess: (res: Reservation) => void;
}

export const CustomerReservation: React.FC<CustomerReservationProps> = ({
  settings,
  activeCustomer,
  onReservationSuccess,
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
      customerId: activeCustomer?.id || null,
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
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Select Specific Table
                </label>
                <select
                  required
                  value={selectedTableId}
                  onChange={(e) => setSelectedTableId(Number(e.target.value))}
                  className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-2.5 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                >
                  <option value="">-- Choose Table ({availableTables.length} available) --</option>
                  {availableTables.map((t) => (
                    <option key={t.id} value={t.id}>
                      Table #{t.tableNumber} ({t.area === 'airconditioned' ? 'Airconditioned' : 'Main Area'}, Capacity: {t.capacity} seats)
                    </option>
                  ))}
                </select>
              </div>

              <h3 className="font-display text-lg font-bold text-stone-900 border-b border-stone-100 pb-3 pt-3">
                2. Contact Information
              </h3>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Full Name
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
                    Phone Number
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

              <button
                type="submit"
                className="w-full rounded-xl bg-amber-500 py-3 text-sm font-extrabold text-stone-950 shadow-md hover:bg-amber-400 transition"
              >
                Confirm &amp; Book Table
              </button>
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
