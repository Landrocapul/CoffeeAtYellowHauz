import React, { useState, useMemo, useEffect } from 'react';
import { Reservation, CustomerAccount, StoreSettings, VenueAddon } from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
import {
  Sparkles,
  Calendar,
  Clock,
  Users,
  Wifi,
  Tv,
  Mic,
  Volume2,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Phone,
  User as UserIcon,
  Lock,
  ShieldCheck,
  LogIn,
  Layers,
  Coffee,
  Plus,
  Info,
  Building,
  CreditCard,
  QrCode,
  DollarSign,
  Printer,
  ChevronRight,
  Maximize2,
  FileText,
} from 'lucide-react';

interface VenueReservationProps {
  settings: StoreSettings;
  activeCustomer: CustomerAccount | null;
  onReservationSuccess: (res: Reservation) => void;
  onRequireLogin?: () => void;
  onNavigateAccount?: () => void;
}

const VENUE_HOURLY_OPTIONS = [
  { hours: 3, label: '3 Hours', subtitle: 'Standard Block', price: 300, isPopular: true },
  { hours: 4, label: '4 Hours', subtitle: 'Workshop / Meeting', price: 400, isPopular: false },
  { hours: 5, label: '5 Hours', subtitle: 'Half-Day Function', price: 500, isPopular: false },
  { hours: 6, label: '6 Hours', subtitle: 'Extended Event', price: 600, isPopular: false },
  { hours: 8, label: '8 Hours', subtitle: 'Full-Day Studio Rental', price: 800, isPopular: false },
];

const EVENT_TYPES = [
  { id: 'meeting', name: '💼 Business Meeting & Planning', desc: 'Conference table, projector & high-speed Wi-Fi' },
  { id: 'workshop', name: '🎨 Creative Workshop & Art Class', desc: 'Flexible desk arrangement & presentation setup' },
  { id: 'celebration', name: '🎉 Birthday & Intimate Gathering', desc: 'Social dining layout, music & food service' },
  { id: 'study', name: '📚 Study Group & Team Review', desc: 'Quiet environment with abundant power sockets' },
  { id: 'photoshoot', name: '📸 Photo / Video Shoot & Content', desc: 'Aesthetic ambient lighting & creative corners' },
  { id: 'tasting', name: '☕ Coffee Tasting & Cupping', desc: 'Barista demonstration & sensory coffee table' },
  { id: 'other', name: '✨ Other Private Function', desc: 'Custom tailored layout for your special event' },
];

const SEATING_LAYOUTS = [
  { id: 'boardroom', name: 'Boardroom / Conference', pax: '12-16 Pax', desc: 'Central conference table for discussions' },
  { id: 'classroom', name: 'Classroom / Seminar', pax: '15-20 Pax', desc: 'Rows facing HD projector & whiteboard' },
  { id: 'banquet', name: 'Banquet / Party Dining', pax: '20-25 Pax', desc: 'Dining tables with buffet counter space' },
  { id: 'lounge', name: 'Casual Lounge & Circle', pax: '10-15 Pax', desc: 'Armchairs, cozy sofas & coffee tables' },
];

const AVAILABLE_ADDONS: { id: string; name: string; description: string; price: number }[] = [
  {
    id: 'coffee_dispenser',
    name: 'Fresh Brewed Coffee Carafe (10-12 Cups)',
    description: 'Freshly brewed Yellow Hauz signature house blend with cups, milk, and sweeteners',
    price: 450,
  },
  {
    id: 'pastry_platter',
    name: 'Artisan Pastry Box (12 Pieces)',
    description: 'Assorted bite-sized blueberry cheesecakes, banana muffins, and fudge brownies',
    price: 380,
  },
  {
    id: 'merienda_tray',
    name: 'Sandwich Merienda Platter (10 Halves)',
    description: 'Selection of grilled garlic cheese, chicken salad, and club sandwiches',
    price: 550,
  },
  {
    id: 'pizza_pack',
    name: 'Double Pizza Special Combo',
    description: '1 Yellow Hauz Special Pizza + 1 Three Cheese Pizza freshly baked from the oven',
    price: 400,
  },
];

const VENUE_PHOTOS = [
  {
    url: '/images/24_Modern_Cafe_Design.webp',
    title: 'Private Event Studio Space',
    desc: 'Spacious airconditioned nook with warm wooden accents',
  },
  {
    url: '/images/28_Seating_Arrangement.webp',
    title: 'Flexible Table Setup',
    desc: 'Easily rearranged for workshops, meetings, or celebrations',
  },
  {
    url: '/images/31_Cafe_Interior.webp',
    title: 'Aesthetic Lighting & Ambiance',
    desc: 'Customizable lighting suitable for photography and seminars',
  },
  {
    url: '/images/34_Cozy_Seating.webp',
    title: 'Comfortable Lounge Corner',
    desc: 'Cozy breakout space for casual chats and coffee breaks',
  },
];

export const VenueReservation: React.FC<VenueReservationProps> = ({
  settings,
  activeCustomer,
  onReservationSuccess,
  onRequireLogin,
  onNavigateAccount,
}) => {
  const { showAlert } = useModal();
  const allReservations = useMemo(() => AppStore.getReservations(), []);

  // Form State
  const [customerName, setCustomerName] = useState(activeCustomer?.fullName || '');
  const [contactNumber, setContactNumber] = useState(activeCustomer?.contactNumber || '');
  const [guestCount, setGuestCount] = useState<number>(12);
  const [selectedDuration, setSelectedDuration] = useState<number>(3); // 3 hours standard
  const [eventType, setEventType] = useState<string>('🎨 Creative Workshop & Art Class');
  const [seatingLayout, setSeatingLayout] = useState<'boardroom' | 'classroom' | 'banquet' | 'lounge'>('classroom');
  const [selectedAddons, setSelectedAddons] = useState<VenueAddon[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'gcash' | 'cash' | 'card'>('gcash');
  const [notes, setNotes] = useState('');
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState(0);

  // Date and Time calculation
  const [date, setDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [timeSlot, setTimeSlot] = useState<string>('14:00'); // 2:00 PM
  const [confirmedReservation, setConfirmedReservation] = useState<Reservation | null>(null);

  // Sync customer account info if available
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

  // Compute End Time based on selected duration
  const endTimeFormatted = useMemo(() => {
    if (!timeSlot) return '';
    const [h, m] = timeSlot.split(':').map(Number);
    const startMins = h * 60 + (m || 0);
    const endMins = startMins + selectedDuration * 60;
    const endH = Math.floor(endMins / 60) % 24;
    const endM = endMins % 60;
    const endH12 = endH % 12 || 12;
    const endAmPm = endH >= 12 ? 'PM' : 'AM';
    const endMStr = endM < 10 ? `0${endM}` : endM;
    return `${endH12}:${endMStr} ${endAmPm}`;
  }, [timeSlot, selectedDuration]);

  // Format 12-hour start time
  const startTimeFormatted = useMemo(() => {
    if (!timeSlot) return '';
    const [h, m] = timeSlot.split(':').map(Number);
    const h12 = h % 12 || 12;
    const amPm = h >= 12 ? 'PM' : 'AM';
    const mStr = m < 10 ? `0${m}` : m;
    return `${h12}:${mStr} ${amPm}`;
  }, [timeSlot]);

  // Pricing calculations
  const baseRate = useMemo(() => {
    // 3 hours = 300 pesos (100 pesos/hr)
    return selectedDuration === 3 ? 300 : selectedDuration * 100;
  }, [selectedDuration]);

  const addonsTotal = useMemo(() => {
    return selectedAddons.reduce((sum, item) => sum + item.price, 0);
  }, [selectedAddons]);

  const grandTotal = useMemo(() => {
    return baseRate + addonsTotal;
  }, [baseRate, addonsTotal]);

  // Conflict Checking: Check if single venue is booked on this date & time range
  const conflictingBooking = useMemo(() => {
    if (!date || !timeSlot) return null;
    const targetStart = new Date(`${date}T${timeSlot}:00`).getTime();
    const targetEnd = targetStart + selectedDuration * 3600000;

    return allReservations.find((res) => {
      if (res.bookingType !== 'venue') return false;
      if (res.status === 'cancelled') return false;

      const resStart = new Date(res.reservationAt).getTime();
      const resDurationHrs = res.venueDurationHours || 3;
      const resEnd = resStart + resDurationHrs * 3600000;

      // Check overlap: StartA < EndB && EndA > StartB
      return targetStart < resEnd && targetEnd > resStart;
    });
  }, [date, timeSlot, selectedDuration, allReservations]);

  const toggleAddon = (addon: { id: string; name: string; price: number }) => {
    setSelectedAddons((prev) => {
      const exists = prev.some((a) => a.id === addon.id);
      if (exists) {
        return prev.filter((a) => a.id !== addon.id);
      } else {
        return [...prev, { id: addon.id, name: addon.name, price: addon.price }];
      }
    });
  };

  const handleBookVenue = (e: React.FormEvent) => {
    e.preventDefault();

    // Mandatory Customer Sign In Check
    if (!activeCustomer) {
      showAlert({
        title: 'Sign In Required',
        message: 'Please sign in or register a customer account before confirming your private venue reservation.',
        type: 'warning',
      });
      if (onRequireLogin) {
        onRequireLogin();
      }
      return;
    }

    if (!customerName.trim() || !contactNumber.trim()) {
      showAlert({
        title: 'Contact Information Required',
        message: 'Please enter your name and phone number so our team can confirm your event booking.',
        type: 'warning',
      });
      return;
    }

    if (conflictingBooking) {
      showAlert({
        title: 'Schedule Conflict Detected',
        message: `The Yellow Hauz Private Studio is already reserved on this date around ${new Date(
          conflictingBooking.reservationAt
        ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Please select an alternate time slot or date.`,
        type: 'error',
      });
      return;
    }

    const reservationAt = `${date}T${timeSlot}:00`;

    const newVenueRes = AppStore.createReservation({
      bookingType: 'venue',
      venueName: 'The Yellow Hauz Private Studio & Event Nook',
      tableId: 99,
      tableNumber: 99,
      venueDurationHours: selectedDuration,
      venueRate: baseRate,
      venueAddons: selectedAddons,
      totalAmount: grandTotal,
      eventType,
      seatingLayout,
      paymentStatus: paymentMethod === 'gcash' ? 'downpayment_paid' : 'unpaid',
      paymentMethod,
      customerId: activeCustomer.id,
      customerName: customerName.trim(),
      contactNumber: contactNumber.trim(),
      guestCount,
      reservationAt,
      notes: notes.trim() || undefined,
    });

    setConfirmedReservation(newVenueRes);
    onReservationSuccess(newVenueRes);
  };

  return (
    <div className="space-y-10">
      {/* Confirmation Success View */}
      {confirmedReservation ? (
        <div className="max-w-2xl mx-auto rounded-3xl border border-emerald-300 bg-white p-6 sm:p-10 shadow-xl space-y-6 animate-in fade-in zoom-in duration-200">
          <div className="text-center space-y-3">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700 mx-auto shadow-xs">
              <CheckCircle className="h-8 w-8" />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
              <ShieldCheck className="h-3.5 w-3.5" />
              Venue Reservation Confirmed
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-stone-900">
              The Private Studio is Booked for You!
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
              We have locked in your schedule. Our event coordinator and baristas are preparing the space, Wi-Fi, audio setup, and amenities.
            </p>
          </div>

          {/* Reservation Code Badge */}
          <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4 text-center">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-800 block">
              Official Venue Voucher Code
            </span>
            <span className="font-mono text-2xl font-black text-amber-950 tracking-wider">
              {confirmedReservation.reservationCode}
            </span>
            <span className="text-[11px] text-stone-500 block mt-1">
              Please present this voucher code upon arrival at the café front counter.
            </span>
          </div>

          {/* Summary Details Grid */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-5 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-stone-200">
              <div>
                <span className="text-stone-400 font-bold uppercase block text-[10px]">Client / Host</span>
                <span className="font-bold text-stone-800 text-sm">{confirmedReservation.customerName}</span>
                <span className="text-stone-500 block">{confirmedReservation.contactNumber}</span>
              </div>
              <div>
                <span className="text-stone-400 font-bold uppercase block text-[10px]">Event Type &amp; Guests</span>
                <span className="font-bold text-stone-800 text-sm">{confirmedReservation.eventType}</span>
                <span className="text-stone-500 block">
                  {confirmedReservation.guestCount} Guests • {confirmedReservation.seatingLayout} setup
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-stone-200">
              <div>
                <span className="text-stone-400 font-bold uppercase block text-[10px]">Date &amp; Schedule</span>
                <span className="font-bold text-stone-800 text-sm">
                  {new Date(confirmedReservation.reservationAt).toLocaleDateString('en-PH', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span className="text-amber-800 font-bold block">
                  {startTimeFormatted} – {endTimeFormatted} ({confirmedReservation.venueDurationHours || 3} Hours)
                </span>
              </div>
              <div>
                <span className="text-stone-400 font-bold uppercase block text-[10px]">Venue Location</span>
                <span className="font-bold text-stone-800">The Yellow Hauz Private Studio</span>
                <span className="text-stone-500 block">V. Mapa &amp; Mabini St., Davao City</span>
              </div>
            </div>

            {/* Inclusions Checklist */}
            <div>
              <span className="text-stone-400 font-bold uppercase block text-[10px] mb-1.5">
                Included Amenities Prepared
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-[11px] text-stone-700">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  High-speed Fiber Wi-Fi
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  Whisper Air-Conditioning
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  HD Projector &amp; Screen
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  Sound &amp; Wireless Mic
                </span>
              </div>
            </div>

            {/* Add-ons if any */}
            {confirmedReservation.venueAddons && confirmedReservation.venueAddons.length > 0 && (
              <div className="pt-2 border-t border-stone-200">
                <span className="text-stone-400 font-bold uppercase block text-[10px] mb-1">
                  Selected Food &amp; Beverage Add-ons
                </span>
                <div className="space-y-1">
                  {confirmedReservation.venueAddons.map((ad, idx) => (
                    <div key={idx} className="flex justify-between text-stone-700 font-medium">
                      <span>• {ad.name}</span>
                      <span className="font-mono font-bold">₱{ad.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total Fee & Payment */}
            <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
              <div>
                <span className="text-stone-400 font-bold uppercase block text-[10px]">Total Venue Fee</span>
                <span className="text-xs text-stone-500 font-medium capitalize">
                  Payment: {confirmedReservation.paymentMethod} (
                  {confirmedReservation.paymentStatus === 'downpayment_paid'
                    ? 'Downpayment Settled'
                    : 'Pay at Counter / Arrival'}
                  )
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono text-xl font-extrabold text-amber-900">
                  ₱{(confirmedReservation.totalAmount || 300).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {onNavigateAccount && (
              <button
                type="button"
                onClick={onNavigateAccount}
                className="flex-1 rounded-xl bg-stone-900 py-3 text-xs font-bold text-amber-400 hover:bg-stone-800 transition text-center"
              >
                View in My Account
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirmedReservation(null)}
              className="flex-1 rounded-xl bg-amber-500 py-3 text-xs font-black text-stone-950 hover:bg-amber-400 transition shadow-md text-center"
            >
              Book Another Event Slot
            </button>
          </div>
        </div>
      ) : (
        /* Venue Booking Form & Showcase */
        <div className="space-y-8">
          {/* Venue Promo Showcase Banner */}
          <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-md">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr] p-6 sm:p-8 items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-xs font-black uppercase tracking-wider text-stone-950 shadow-xs">
                    <Sparkles className="h-3.5 w-3.5" />
                    Special Rate
                  </span>
                  <span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-extrabold text-amber-400 uppercase tracking-wider">
                    Only 1 Exclusive Venue Place
                  </span>
                </div>

                <h2 className="mt-3 font-display text-2xl sm:text-3xl font-black text-stone-950 leading-tight">
                  The Yellow Hauz Private Studio &amp; Event Nook
                </h2>

                <p className="mt-2 text-xs sm:text-sm text-stone-600 leading-relaxed">
                  Host your private team meetings, creative workshops, birthday gatherings, co-working sessions, and special events in our dedicated airconditioned studio.
                </p>

                {/* Rate Highlight Card */}
                <div className="mt-4 inline-flex items-baseline gap-2 rounded-2xl bg-amber-50 border border-amber-300/80 px-4 py-2.5 shadow-2xs">
                  <span className="font-mono text-2xl sm:text-3xl font-black text-amber-950">₱300.00</span>
                  <span className="text-xs font-bold text-amber-900">for 3 Full Hours</span>
                  <span className="text-[11px] text-stone-500">• (₱100 / additional hour)</span>
                </div>

                {/* Amenities Grid */}
                <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-stone-700">
                  <div className="flex items-center gap-2 rounded-xl bg-stone-50 p-2 border border-stone-100">
                    <Wifi className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>High-Speed Fiber Wi-Fi</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-stone-50 p-2 border border-stone-100">
                    <Tv className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>HD Projector &amp; Screen</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-stone-50 p-2 border border-stone-100">
                    <Mic className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Sound System &amp; Wireless Mic</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-stone-50 p-2 border border-stone-100">
                    <Coffee className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>In-Room Café Ordering</span>
                  </div>
                </div>
              </div>

              {/* Photo Showcase Carousel */}
              <div className="space-y-3">
                <div className="relative aspect-16/10 overflow-hidden rounded-2xl bg-stone-900 border border-stone-200 shadow-sm">
                  <img
                    src={VENUE_PHOTOS[selectedPhotoIdx].url}
                    alt={VENUE_PHOTOS[selectedPhotoIdx].title}
                    className="h-full w-full object-cover transition duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h4 className="font-display text-sm font-bold">{VENUE_PHOTOS[selectedPhotoIdx].title}</h4>
                    <p className="text-[11px] text-stone-300">{VENUE_PHOTOS[selectedPhotoIdx].desc}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {VENUE_PHOTOS.map((ph, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedPhotoIdx(idx)}
                      className={`relative aspect-square overflow-hidden rounded-xl border-2 transition ${
                        selectedPhotoIdx === idx ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-stone-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={ph.url} alt={ph.title} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Booking Form Layout */}
          <form onSubmit={handleBookVenue} className="grid gap-8 lg:grid-cols-[1.15fr_.85fr]">
            {/* Left Column: Booking Form Parameters */}
            <div className="space-y-6 rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
              {/* Step 1: Duration Selector */}
              <div>
                <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-3">
                  <h3 className="font-display text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-600" />
                    1. Select Reservation Duration
                  </h3>
                  <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    Base: 3 Hours @ ₱300
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {VENUE_HOURLY_OPTIONS.map((opt) => {
                    const isSelected = selectedDuration === opt.hours;
                    return (
                      <button
                        key={opt.hours}
                        type="button"
                        onClick={() => setSelectedDuration(opt.hours)}
                        className={`relative rounded-2xl p-3.5 text-left border-2 transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/90 shadow-xs ring-2 ring-amber-500/20'
                            : 'border-stone-200 bg-stone-50 hover:bg-stone-100 hover:border-stone-300'
                        }`}
                      >
                        {opt.isPopular && (
                          <span className="absolute -top-2.5 right-2 rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-black uppercase text-stone-950 shadow-2xs">
                            Standard
                          </span>
                        )}
                        <span className="font-mono text-base font-black text-stone-900 block">
                          ₱{opt.price}
                        </span>
                        <span className="font-bold text-xs text-stone-800 block mt-0.5">
                          {opt.label}
                        </span>
                        <span className="text-[10px] text-stone-500 block">
                          {opt.subtitle}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Date & Time Slot */}
              <div>
                <h3 className="font-display text-base font-bold text-stone-900 flex items-center gap-2 border-b border-stone-100 pb-3 mb-3">
                  <Calendar className="h-5 w-5 text-amber-600" />
                  2. Choose Date &amp; Start Time
                </h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Event Date
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-2.5 h-4 w-4 text-stone-400" />
                      <input
                        type="date"
                        required
                        value={date}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full rounded-xl border border-stone-300 bg-stone-50 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Start Time
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3.5 top-2.5 h-4 w-4 text-stone-400" />
                      <select
                        value={timeSlot}
                        onChange={(e) => setTimeSlot(e.target.value)}
                        className="w-full rounded-xl border border-stone-300 bg-stone-50 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                      >
                        <option value="08:00">08:00 AM (Morning Session)</option>
                        <option value="09:00">09:00 AM (Morning Workshop)</option>
                        <option value="10:30">10:30 AM (Late Morning / Lunch Block)</option>
                        <option value="13:00">01:00 PM (Early Afternoon)</option>
                        <option value="14:00">02:00 PM (Afternoon Workshop / Meeting)</option>
                        <option value="16:00">04:00 PM (Late Afternoon / Merienda)</option>
                        <option value="18:00">06:00 PM (Evening Gathering / Dinner)</option>
                        <option value="19:00">07:00 PM (Night Function)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Computed Time Slot Badge */}
                <div className="mt-3 flex items-center justify-between rounded-xl bg-stone-100 p-3 text-xs">
                  <span className="text-stone-600 font-medium">Reserved Time Window:</span>
                  <span className="font-mono font-bold text-amber-900 bg-white px-3 py-1 rounded-lg border border-stone-200">
                    {startTimeFormatted} – {endTimeFormatted} ({selectedDuration} Hours)
                  </span>
                </div>

                {/* Conflict Alert if venue is already booked */}
                {conflictingBooking && (
                  <div className="mt-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-800 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-rose-900">
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      <span>Slot Already Booked ({conflictingBooking.reservationCode})</span>
                    </div>
                    <p className="leading-relaxed">
                      The studio is booked on {new Date(conflictingBooking.reservationAt).toLocaleDateString()} around{' '}
                      {new Date(conflictingBooking.reservationAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      . Please adjust your time slot or pick a different date.
                    </p>
                  </div>
                )}
              </div>

              {/* Step 3: Event Purpose & Seating Configuration */}
              <div>
                <h3 className="font-display text-base font-bold text-stone-900 flex items-center gap-2 border-b border-stone-100 pb-3 mb-3">
                  <Layers className="h-5 w-5 text-amber-600" />
                  3. Event Purpose &amp; Layout
                </h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Event Type / Occasion
                    </label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
                    >
                      {EVENT_TYPES.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Expected Guests (Max 25 Pax)
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3.5 top-2.5 h-4 w-4 text-stone-400" />
                      <select
                        value={guestCount}
                        onChange={(e) => setGuestCount(Number(e.target.value))}
                        className="w-full rounded-xl border border-stone-300 bg-stone-50 pl-10 pr-4 py-2.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
                      >
                        {[4, 6, 8, 10, 12, 15, 18, 20, 22, 25].map((n) => (
                          <option key={n} value={n}>
                            {n} Guests
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Preferred Seating Arrangement
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {SEATING_LAYOUTS.map((lay) => {
                      const isSelected = seatingLayout === lay.id;
                      return (
                        <button
                          key={lay.id}
                          type="button"
                          onClick={() => setSeatingLayout(lay.id as any)}
                          className={`p-2.5 rounded-xl border text-left transition ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-500/20 font-bold'
                              : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                          }`}
                        >
                          <span className="text-xs font-bold block leading-tight">{lay.name}</span>
                          <span className="text-[10px] text-stone-500 block mt-0.5">{lay.pax}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Step 4: Optional Hospitality Add-ons */}
              <div>
                <h3 className="font-display text-base font-bold text-stone-900 flex items-center gap-2 border-b border-stone-100 pb-3 mb-3">
                  <Coffee className="h-5 w-5 text-amber-600" />
                  4. Hospitality &amp; Refreshment Add-ons (Optional)
                </h3>

                <div className="space-y-2">
                  {AVAILABLE_ADDONS.map((addon) => {
                    const isChecked = selectedAddons.some((a) => a.id === addon.id);
                    return (
                      <div
                        key={addon.id}
                        onClick={() => toggleAddon(addon)}
                        className={`flex items-start justify-between gap-3 p-3 rounded-2xl border cursor-pointer transition select-none ${
                          isChecked
                            ? 'border-amber-500 bg-amber-50/80 shadow-2xs'
                            : 'border-stone-200 bg-white hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="mt-1 h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                          />
                          <div>
                            <span className="font-bold text-xs text-stone-900 block">{addon.name}</span>
                            <span className="text-[11px] text-stone-500 block mt-0.5 leading-relaxed">
                              {addon.description}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-xs text-amber-900 shrink-0 bg-white px-2 py-1 rounded-lg border border-stone-200">
                          +₱{addon.price}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 5: Customer Contact Info */}
              <div>
                <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-3">
                  <h3 className="font-display text-base font-bold text-stone-900 flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-amber-600" />
                    5. Contact Information &amp; Account
                  </h3>
                  {activeCustomer ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Signed In
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                      <Lock className="h-3 w-3" />
                      Sign In Required
                    </span>
                  )}
                </div>

                {!activeCustomer ? (
                  <div className="mb-4 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-stone-50 p-4 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500 text-stone-950 shrink-0 shadow-xs">
                          <Lock className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wide">
                            Sign In Required to Reserve Venue
                          </h4>
                          <p className="text-xs text-stone-600 mt-0.5">
                            Please sign in or create an account to record your booking voucher in your customer portal.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onRequireLogin}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-stone-950 shadow-xs hover:bg-amber-400 transition shrink-0"
                      >
                        <LogIn className="h-4 w-4" />
                        Sign In / Register
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-200 text-emerald-900 font-bold text-xs">
                        {activeCustomer.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-xs">
                        <span className="font-bold text-stone-900 block">{activeCustomer.fullName}</span>
                        <span className="text-stone-500">{activeCustomer.email}</span>
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

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-3.5 top-2.5 h-4 w-4 text-stone-400" />
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. Maria Santos"
                        className="w-full rounded-xl border border-stone-300 bg-stone-50 pl-10 pr-4 py-2 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Phone Number *
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

                <div className="mt-3">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Special Setup Instructions / Requests
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Need 2 extension cords for laptops, HDMI adapter for Mac, surprise birthday banner setup..."
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 p-3 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary & Checkout Card */}
            <div className="space-y-4">
              <div className="sticky top-20 rounded-3xl border border-stone-200 bg-white p-6 shadow-md space-y-5">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <h3 className="font-display text-lg font-bold text-stone-900">
                    Reservation Summary
                  </h3>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-900 uppercase">
                    Studio Rental
                  </span>
                </div>

                {/* Schedule Snapshot */}
                <div className="rounded-2xl bg-stone-50 border border-stone-200/80 p-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Date:</span>
                    <span className="font-bold text-stone-900">
                      {new Date(date).toLocaleDateString('en-PH', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Schedule:</span>
                    <span className="font-bold text-amber-900">
                      {startTimeFormatted} – {endTimeFormatted}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Duration:</span>
                    <span className="font-bold text-stone-900">{selectedDuration} Hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Guests:</span>
                    <span className="font-bold text-stone-900">{guestCount} Pax</span>
                  </div>
                </div>

                {/* Itemized Price Breakdown */}
                <div className="space-y-2 text-xs border-y border-stone-100 py-3">
                  <div className="flex justify-between text-stone-700">
                    <span>
                      Studio Base Rental ({selectedDuration} hrs)
                    </span>
                    <span className="font-mono font-bold">₱{baseRate.toFixed(2)}</span>
                  </div>

                  {selectedAddons.map((ad) => (
                    <div key={ad.id} className="flex justify-between text-stone-600">
                      <span className="truncate max-w-[200px]">• {ad.name}</span>
                      <span className="font-mono font-bold">₱{ad.price.toFixed(2)}</span>
                    </div>
                  ))}

                  <div className="pt-2 border-t border-stone-200 flex justify-between items-baseline">
                    <span className="font-display font-bold text-sm text-stone-900">Total Amount:</span>
                    <span className="font-mono text-2xl font-black text-amber-950">
                      ₱{grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Payment Option */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Payment Preference
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('gcash')}
                      className={`p-2 rounded-xl border text-center text-xs font-bold transition flex flex-col items-center gap-1 ${
                        paymentMethod === 'gcash'
                          ? 'border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20'
                          : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <QrCode className="h-4 w-4 text-blue-600" />
                      <span>GCash</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`p-2 rounded-xl border text-center text-xs font-bold transition flex flex-col items-center gap-1 ${
                        paymentMethod === 'cash'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                          : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      <span>Walk-in Cash</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`p-2 rounded-xl border text-center text-xs font-bold transition flex flex-col items-center gap-1 ${
                        paymentMethod === 'card'
                          ? 'border-purple-500 bg-purple-50 text-purple-900 ring-2 ring-purple-500/20'
                          : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <CreditCard className="h-4 w-4 text-purple-600" />
                      <span>Card Tap</span>
                    </button>
                  </div>

                  {paymentMethod === 'gcash' && (
                    <div className="rounded-xl bg-blue-50 border border-blue-200 p-2.5 text-[11px] text-blue-950 space-y-1">
                      <div className="font-bold flex items-center gap-1">
                        <QrCode className="h-3.5 w-3.5 text-blue-700" />
                        <span>GCash QR Available on Voucher</span>
                      </div>
                      <p className="text-blue-800">
                        Scan GCash QR or send to Yellow Hauz ({settings.shop_phone}) to settle your reservation fee.
                      </p>
                    </div>
                  )}
                </div>

                {/* Submit Action */}
                {activeCustomer ? (
                  <button
                    type="submit"
                    disabled={!!conflictingBooking}
                    className={`w-full rounded-2xl py-3.5 text-sm font-black transition shadow-md flex items-center justify-center gap-2 ${
                      conflictingBooking
                        ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                        : 'bg-amber-500 text-stone-950 hover:bg-amber-400 active:scale-[0.99]'
                    }`}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Reserve Studio for ₱{grandTotal.toFixed(2)}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      showAlert({
                        title: 'Sign In Required',
                        message: 'Please sign in or register to complete your private studio booking.',
                        type: 'warning',
                      });
                      if (onRequireLogin) onRequireLogin();
                    }}
                    className="w-full rounded-2xl bg-stone-950 py-3.5 text-sm font-extrabold text-amber-400 hover:bg-stone-800 transition flex items-center justify-center gap-2 shadow-md"
                  >
                    <Lock className="h-4 w-4 text-amber-400" />
                    Sign In to Book Venue
                  </button>
                )}

                <div className="flex items-start gap-2 text-[11px] text-stone-500">
                  <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Free cancellation up to 24 hours prior to event start. For urgent inquiries call {settings.shop_phone}.
                  </span>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
