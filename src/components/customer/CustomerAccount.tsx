import React, { useMemo } from 'react';
import { CustomerAccount, Order, Reservation, StoreSettings } from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
import { User, Mail, Phone, ShoppingBag, Calendar, Clock, CheckCircle2, XCircle, LogOut } from 'lucide-react';

interface CustomerAccountProps {
  customer: CustomerAccount;
  settings: StoreSettings;
  onLogout: () => void;
  onViewReceipt: (order: Order) => void;
}

export const CustomerAccountView: React.FC<CustomerAccountProps> = ({
  customer,
  settings,
  onLogout,
  onViewReceipt,
}) => {
  const { showConfirm, showAlert } = useModal();
  const allOrders = useMemo(() => AppStore.getOrders(), []);
  const allReservations = useMemo(() => AppStore.getReservations(), []);

  // Filter for customer
  const customerOrders = useMemo(() => {
    return allOrders.filter(
      (o) =>
        o.customerId === customer.id ||
        (o.customerName && o.customerName.toLowerCase() === customer.fullName.toLowerCase())
    );
  }, [allOrders, customer]);

  const customerReservations = useMemo(() => {
    return allReservations.filter(
      (r) =>
        r.customerId === customer.id ||
        (customer.fullName && r.customerName && r.customerName.toLowerCase() === customer.fullName.toLowerCase())
    );
  }, [allReservations, customer]);

  const handleCancelReservation = async (id: number) => {
    const ok = await showConfirm({
      title: 'Cancel Reservation?',
      message: 'Are you sure you want to cancel this reservation booking?',
      type: 'danger',
      confirmText: 'Yes, Cancel',
      cancelText: 'Keep Booking',
    });
    if (ok) {
      AppStore.updateReservationStatus(id, 'cancelled');
      showAlert({
        title: 'Cancelled',
        message: 'Your reservation has been cancelled.',
        type: 'info',
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Profile Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-500 text-stone-950 font-display text-2xl font-extrabold">
            {(customer.fullName || 'C').charAt(0)}
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Customer Account
            </span>
            <h1 className="text-2xl font-bold text-stone-900 font-display">
              {customer.fullName || 'Customer'}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-stone-500">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-stone-400" />
                {customer.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-stone-400" />
                {customer.contactNumber}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Table Reservations History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-600" />
              <h2 className="font-display text-lg font-bold text-stone-900">
                Your Table Bookings ({customerReservations.length})
              </h2>
            </div>
          </div>

          {customerReservations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-stone-500 text-xs">
              No reservation records found.
            </div>
          ) : (
            <div className="space-y-3">
              {customerReservations.map((res) => (
                <div
                  key={res.id}
                  className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      {res.reservationCode}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        res.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : res.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {res.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-stone-600 pt-1">
                    <div>
                      <span className="text-stone-400 block">Table:</span>
                      <span className="font-bold text-stone-800">
                        Table #{res.tableNumber} ({res.guestCount} Guests)
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block">Date &amp; Time:</span>
                      <span className="font-bold text-stone-800">
                        {new Date(res.reservationAt).toLocaleString('en-PH', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                  </div>

                  {res.notes && (
                    <p className="text-stone-500 italic pt-1 border-t border-stone-100">
                      "{res.notes}"
                    </p>
                  )}

                  {res.status === 'pending' && (
                    <div className="pt-2 border-t border-stone-100 flex justify-end">
                      <button
                        onClick={() => handleCancelReservation(res.id)}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700"
                      >
                        Cancel Booking
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Online Orders History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-amber-600" />
              <h2 className="font-display text-lg font-bold text-stone-900">
                Order History ({customerOrders.length})
              </h2>
            </div>
          </div>

          {customerOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-stone-500 text-xs">
              No orders placed yet.
            </div>
          ) : (
            <div className="space-y-3">
              {customerOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs space-y-2.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-stone-900">{ord.orderNumber}</span>
                      <span className="text-[10px] text-stone-400">
                        {new Date(ord.createdAt).toLocaleDateString()}
                      </span>
                      <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-stone-600">
                        {ord.channel === 'online' ? '🌐 Online' : '🏪 In-Store'}
                      </span>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        ord.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ord.status === 'processing'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {ord.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-stone-600 border-y border-stone-100 py-2">
                    {ord.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>
                          {it.quantity}x {it.name}
                        </span>
                        <span className="font-mono">₱{it.totalPrice.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-stone-400">Total Paid: </span>
                      <span className="font-mono font-bold text-amber-800 text-sm">
                        ₱{ord.totalAmount.toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={() => onViewReceipt(ord)}
                      className="rounded-lg bg-stone-100 hover:bg-stone-200 px-3 py-1 text-xs font-bold text-stone-800 transition"
                    >
                      View Receipt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
