import React from 'react';
import { MenuItem, StoreSettings } from '../../types';
import { ShoppingBag, Calendar, Clock, Utensils, Heart, Sparkles, ArrowRight, ShieldCheck, MapPin, Phone } from 'lucide-react';

interface CustomerHomeProps {
  bestSellers: MenuItem[];
  settings: StoreSettings;
  onNavigateMenu: () => void;
  onNavigateReservation: () => void;
  onAddToCart: (item: MenuItem) => void;
}

export const CustomerHome: React.FC<CustomerHomeProps> = ({
  bestSellers,
  settings,
  onNavigateMenu,
  onNavigateReservation,
  onAddToCart,
}) => {
  return (
    <div className="space-y-10 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-stone-900 text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/20 via-stone-900/40 to-transparent pointer-events-none" />

        <div className="relative grid gap-8 px-6 py-12 sm:px-10 sm:py-16 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:gap-12 lg:px-14">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 border border-amber-500/30 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-widest text-amber-400">
              <Sparkles className="h-3.5 w-3.5" />
              Established 2007 • Davao City
            </span>
            <h1 className="mt-5 font-display text-3xl font-extrabold leading-[1.15] sm:text-5xl text-stone-50">
              Coffee, breakfast &amp; comfort food made for lingering.
            </h1>
            <p className="mt-4 max-w-lg text-sm sm:text-base leading-relaxed text-stone-300">
              From our famous slow-crisped pork adobo flakes to freshly pulled artisan lattes and handcrafted cheesecakes. Order ahead for fast pickup or dine-in, or reserve your table.
            </p>

            <div className="mt-8 flex flex-wrap gap-3.5">
              <button
                onClick={onNavigateMenu}
                className="inline-flex h-12 items-center gap-2.5 rounded-xl bg-amber-500 px-6 text-sm font-extrabold text-stone-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition transform active:scale-95"
              >
                <ShoppingBag className="h-4 w-4" />
                Order Online
              </button>
              <button
                onClick={onNavigateReservation}
                className="inline-flex h-12 items-center gap-2.5 rounded-xl border border-stone-700 bg-stone-800/80 px-6 text-sm font-bold text-stone-100 hover:bg-stone-800 transition"
              >
                <Calendar className="h-4 w-4" />
                Reserve a Table
              </button>
            </div>

            <div className="mt-8 flex items-center gap-6 text-xs text-stone-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-400" />
                <span>Locally Sourced Ingredients</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-400" />
                <span>Open 7:00 AM - 10:00 PM</span>
              </div>
            </div>
          </div>

          {/* Hero Collage */}
          <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
            <div className="space-y-3.5">
              <div className="aspect-square overflow-hidden rounded-2xl bg-stone-800 border border-stone-800 shadow-md">
                <img
                  src="/images/latte.webp"
                  alt="Latte"
                  className="h-full w-full object-cover hover:scale-105 transition duration-300"
                />
              </div>
              <div className="aspect-4/3 overflow-hidden rounded-2xl bg-stone-800 border border-stone-800 shadow-md">
                <img
                  src="/images/porkadoboflakes.webp"
                  alt="Pork Adobo Flakes"
                  className="h-full w-full object-cover hover:scale-105 transition duration-300"
                />
              </div>
            </div>
            <div className="space-y-3.5 pt-6">
              <div className="aspect-4/3 overflow-hidden rounded-2xl bg-stone-800 border border-stone-800 shadow-md">
                <img
                  src="/images/cheesecakeduo.webp"
                  alt="Cheesecake"
                  className="h-full w-full object-cover hover:scale-105 transition duration-300"
                />
              </div>
              <div className="aspect-square overflow-hidden rounded-2xl bg-stone-800 border border-stone-800 shadow-md">
                <img
                  src="/images/tiramisu.webp"
                  alt="Tiramisu"
                  className="h-full w-full object-cover hover:scale-105 transition duration-300"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Info Strip */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-start gap-4 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Operating Hours</p>
            <p className="mt-0.5 font-display text-base font-bold text-stone-900">
              {settings.business_hours} (Daily)
            </p>
            <p className="text-xs text-stone-500 mt-0.5">Breakfast, Lunch, Merienda &amp; Dinner</p>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
            <Utensils className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Curated Menu</p>
            <p className="mt-0.5 font-display text-base font-bold text-stone-900">
              17 Signature Categories
            </p>
            <p className="text-xs text-stone-500 mt-0.5">Specialty beans, pastries &amp; hot mains</p>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Location</p>
            <p className="mt-0.5 font-display text-base font-bold text-stone-900">
              {settings.shop_address}
            </p>
            <p className="text-xs text-stone-500 mt-0.5">Airconditioned &amp; Garden Dining</p>
          </div>
        </div>
      </section>

      {/* Best Sellers Showcase */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-700">
              Customer Favorites
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-display">
              Best Sellers at Yellow Hauz
            </h2>
          </div>
          <button
            onClick={onNavigateMenu}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-700 hover:text-amber-800 transition"
          >
            <span>View Full Menu</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {bestSellers.map((item) => (
            <div
              key={item.id}
              className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xs transition hover:shadow-md hover:border-amber-200"
            >
              <div className="relative aspect-16/10 overflow-hidden bg-stone-100">
                <img
                  src={item.imageUrl || '/images/latte.webp'}
                  alt={item.name}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/latte.webp';
                  }}
                />
                <div className="absolute top-3 left-3 flex gap-1.5">
                  <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-stone-950 shadow-xs">
                    Best Seller
                  </span>
                  <span className="rounded-full bg-stone-900/80 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-bold text-white uppercase">
                    {item.temperature}
                  </span>
                </div>
                <div className="absolute bottom-3 right-3 rounded-xl bg-stone-900/90 backdrop-blur-xs px-3 py-1 font-mono text-sm font-bold text-amber-400 shadow-sm">
                  ₱{item.price.toFixed(2)}
                </div>
              </div>

              <div className="flex flex-1 flex-col justify-between p-5">
                <div>
                  <h3 className="font-display text-lg font-bold text-stone-900 group-hover:text-amber-800 transition">
                    {item.name}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-stone-600 line-clamp-2">
                    {item.description}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4">
                  <span className="text-[11px] font-medium text-stone-500">
                    Stock: {item.quantity} left
                  </span>
                  <button
                    onClick={() => onAddToCart(item)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-stone-950 shadow-xs hover:bg-amber-400 transition active:scale-95"
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    Add to Order
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Time-Based Menus Highlights */}
      <section className="rounded-3xl border border-amber-200/70 bg-gradient-to-br from-amber-50/60 to-orange-50/40 p-6 sm:p-8">
        <div className="max-w-2xl">
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-800">
            Daily Kitchen Highlights
          </span>
          <h3 className="mt-1 font-display text-2xl font-bold text-stone-900">
            Tailored for Every Time of Day
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-stone-600 leading-relaxed">
            Whether you are waking up to our hearty longganisa and pour-overs, craving afternoon cheesecake &amp; iced lattes, or sharing hot pizzas with friends in the evening.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {settings.time_based_menus.map((menu, idx) => (
            <div key={idx} className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                  {menu.time}
                </span>
              </div>
              <h4 className="mt-2 font-display text-base font-bold text-stone-900">{menu.title}</h4>
              <p className="mt-1 text-xs text-stone-600 line-clamp-2">{menu.focus}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {menu.item_names.slice(0, 3).map((item, i) => (
                  <span key={i} className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
