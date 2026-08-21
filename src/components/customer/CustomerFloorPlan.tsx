import React, { useState } from 'react';
import { Table, StoreSettings, Reservation } from '../../types';
import {
  Users,
  Sparkles,
  Calendar,
  Clock,
  Wind,
  Coffee,
  CheckCircle,
  HelpCircle,
  DoorOpen,
  Eye,
  Info,
  Maximize2,
} from 'lucide-react';

interface CustomerFloorPlanProps {
  tables: Table[];
  onSelectTable: (table: Table) => void;
  selectedTableId?: number | null;
}

export const CustomerFloorPlan: React.FC<CustomerFloorPlanProps> = ({
  tables,
  onSelectTable,
  selectedTableId,
}) => {
  const [hoveredTableId, setHoveredTableId] = useState<number | null>(null);
  const [areaFilter, setAreaFilter] = useState<'all' | 'normal' | 'airconditioned'>('all');

  // Split tables by area
  const mainDiningTables = tables.filter((t) => t.area === 'normal');
  const airconTables = tables.filter((t) => t.area === 'airconditioned');

  const renderTable = (table: Table) => {
    const isHovered = hoveredTableId === table.id;
    const isSelected = selectedTableId === table.id;
    const isAircon = table.area === 'airconditioned';

    const isLarge = table.capacity >= 6;
    const isExtraLarge = table.capacity >= 8;
    const isTwoSeater = table.capacity <= 2;

    const isAvailable = table.status === 'available';
    const isReserved = table.status === 'reserved';
    const isOccupied = table.status === 'occupied';

    return (
      <div
        key={table.id}
        onMouseEnter={() => setHoveredTableId(table.id)}
        onMouseLeave={() => setHoveredTableId(null)}
        onClick={() => onSelectTable(table)}
        className="relative group cursor-pointer select-none transition-all duration-300 transform hover:-translate-y-1.5 focus:outline-none"
        style={{
          minWidth: isExtraLarge ? '210px' : isLarge ? '180px' : isTwoSeater ? '130px' : '150px',
          maxWidth: isExtraLarge ? '230px' : isLarge ? '195px' : isTwoSeater ? '140px' : '165px',
        }}
      >
        {/* Chair Indicators Top */}
        <div className="absolute -top-3.5 left-0 right-0 flex justify-center gap-4 sm:gap-6 pointer-events-none z-0">
          <div className={`w-8 sm:w-10 h-3 border-2 rounded-t-full transition-all duration-200 ${
            isHovered
              ? 'border-amber-400 bg-amber-100 shadow-xs'
              : 'border-stone-300 bg-stone-100/90'
          }`} />
          {!isTwoSeater && (
            <div className={`w-8 sm:w-10 h-3 border-2 rounded-t-full transition-all duration-200 ${
              isHovered
                ? 'border-amber-400 bg-amber-100 shadow-xs'
                : 'border-stone-300 bg-stone-100/90'
            }`} />
          )}
        </div>

        {/* Chair Indicators Bottom */}
        <div className="absolute -bottom-3.5 left-0 right-0 flex justify-center gap-4 sm:gap-6 pointer-events-none z-0">
          <div className={`w-8 sm:w-10 h-3 border-2 rounded-b-full transition-all duration-200 ${
            isHovered
              ? 'border-amber-400 bg-amber-100 shadow-xs'
              : 'border-stone-300 bg-stone-100/90'
          }`} />
          {!isTwoSeater && (
            <div className={`w-8 sm:w-10 h-3 border-2 rounded-b-full transition-all duration-200 ${
              isHovered
                ? 'border-amber-400 bg-amber-100 shadow-xs'
                : 'border-stone-300 bg-stone-100/90'
            }`} />
          )}
        </div>

        {/* Side Chairs for 6 or 8 seaters */}
        {isLarge && (
          <>
            {/* Left Chairs */}
            <div className="absolute -left-3.5 top-0 bottom-0 flex flex-col justify-center gap-3 pointer-events-none z-0">
              <div className={`h-8 sm:h-9 w-3 border-2 rounded-l-full transition-all duration-200 ${
                isHovered ? 'border-amber-400 bg-amber-100' : 'border-stone-300 bg-stone-100/90'
              }`} />
              {isExtraLarge && (
                <div className={`h-8 sm:h-9 w-3 border-2 rounded-l-full transition-all duration-200 ${
                  isHovered ? 'border-amber-400 bg-amber-100' : 'border-stone-300 bg-stone-100/90'
                }`} />
              )}
            </div>

            {/* Right Chairs */}
            <div className="absolute -right-3.5 top-0 bottom-0 flex flex-col justify-center gap-3 pointer-events-none z-0">
              <div className={`h-8 sm:h-9 w-3 border-2 rounded-r-full transition-all duration-200 ${
                isHovered ? 'border-amber-400 bg-amber-100' : 'border-stone-300 bg-stone-100/90'
              }`} />
              {isExtraLarge && (
                <div className={`h-8 sm:h-9 w-3 border-2 rounded-r-full transition-all duration-200 ${
                  isHovered ? 'border-amber-400 bg-amber-100' : 'border-stone-300 bg-stone-100/90'
                }`} />
              )}
            </div>
          </>
        )}

        {/* Main Table Surface */}
        <div
          className={`relative z-10 flex flex-col justify-between rounded-2xl p-4 transition-all duration-200 border-2 shadow-xs ${
            isSelected
              ? 'bg-amber-100 border-amber-500 shadow-md ring-4 ring-amber-500/20'
              : isHovered
              ? 'bg-amber-50/90 border-amber-400 shadow-lg ring-4 ring-amber-400/20 scale-[1.02]'
              : isReserved
              ? 'bg-amber-50/60 border-amber-300'
              : isOccupied
              ? 'bg-stone-900 border-stone-700 text-white'
              : 'bg-white border-stone-200 hover:border-amber-400'
          }`}
          style={{
            minHeight: isExtraLarge ? '145px' : isLarge ? '135px' : isTwoSeater ? '115px' : '125px',
          }}
        >
          {/* Table Header: Number & Capacity */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <span
                className={`grid h-7 w-7 place-items-center rounded-xl text-xs font-black shadow-xs ${
                  isSelected || isHovered
                    ? 'bg-amber-500 text-stone-950'
                    : isAircon
                    ? 'bg-sky-100 text-sky-900 border border-sky-200'
                    : 'bg-stone-100 text-stone-800 border border-stone-200'
                }`}
              >
                T{table.tableNumber}
              </span>
              <span className={`text-[11px] font-bold ${isOccupied ? 'text-stone-200' : 'text-stone-900'}`}>
                Table {table.tableNumber}
              </span>
            </div>

            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isOccupied
                  ? 'bg-stone-800 text-stone-300'
                  : isHovered || isSelected
                  ? 'bg-amber-200/90 text-amber-900'
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              <Users className="h-3 w-3" />
              {table.capacity}p
            </span>
          </div>

          {/* Area & Feature Badge */}
          <div className="my-1 text-[10px] font-semibold flex items-center justify-between">
            <span
              className={`px-1.5 py-0.5 rounded ${
                isAircon
                  ? 'bg-sky-50 text-sky-700 border border-sky-200/60'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
              }`}
            >
              {isAircon ? '❄️ AC Room' : '🌿 Garden'}
            </span>

            {isExtraLarge ? (
              <span className="text-[9px] text-stone-400 font-medium">Big Group</span>
            ) : isTwoSeater ? (
              <span className="text-[9px] text-stone-400 font-medium">Duo</span>
            ) : (
              <span className="text-[9px] text-stone-400 font-medium">Standard</span>
            )}
          </div>

          {/* Status Indicator */}
          <div className="flex items-center justify-between pt-1 border-t border-stone-100/80">
            <div className="flex items-center gap-1.5 text-[10px] font-bold">
              <span
                className={`h-2 w-2 rounded-full animate-pulse ${
                  isOccupied
                    ? 'bg-stone-400'
                    : isReserved
                    ? 'bg-amber-400'
                    : 'bg-emerald-500'
                }`}
              />
              <span className={isOccupied ? 'text-stone-300' : isReserved ? 'text-amber-800' : 'text-emerald-700'}>
                {isOccupied ? 'Occupied' : isReserved ? 'Reserved' : 'Available'}
              </span>
            </div>
            
            <span className="text-[10px] font-extrabold text-amber-600 group-hover:text-amber-700 underline">
              Book
            </span>
          </div>

          {/* Floating Hover Card / Tooltip saying "Reserve Table" */}
          {isHovered && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-30 pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-1.5 rounded-xl bg-stone-950 px-3 py-1.5 text-xs font-black text-amber-300 shadow-xl border border-amber-500/30">
                <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-spin" />
                <span>Reserve Table #{table.tableNumber}</span>
                <span className="text-[10px] text-stone-300 font-normal">
                  ({table.capacity} seats)
                </span>
              </div>
              {/* Tooltip triangle arrow */}
              <div className="mx-auto h-0 w-0 border-x-4 border-x-transparent border-t-4 border-t-stone-950" />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Floor Plan Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-800 font-bold">
            <Maximize2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-stone-900">
              Interactive Café Floor Plan
            </h3>
            <p className="text-xs text-stone-500">
              Hover over any table to view options and click to open reservation details.
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAreaFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              areaFilter === 'all'
                ? 'bg-stone-900 text-amber-400 shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All Tables ({tables.length})
          </button>
          <button
            type="button"
            onClick={() => setAreaFilter('normal')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
              areaFilter === 'normal'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <span>🌿 Main Dining &amp; Garden</span>
          </button>
          <button
            type="button"
            onClick={() => setAreaFilter('airconditioned')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
              areaFilter === 'airconditioned'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <span>❄️ AC Studio Room</span>
          </button>
        </div>
      </div>

      {/* Main Floor Plan Architectural Stage */}
      <div className="relative rounded-3xl border-2 border-stone-300 bg-[#fbf9f5] p-5 sm:p-8 shadow-inner overflow-x-auto">
        
        {/* Subtle architectural grid pattern background */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none rounded-3xl"
          style={{
            backgroundImage: `radial-gradient(#000 1px, transparent 1px)`,
            backgroundSize: '16px 16px',
          }}
        />

        {/* Architectural Legend & Landmarks Bar */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-stone-200/90 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
              <span className="font-bold text-stone-700">Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-amber-400 ring-2 ring-amber-100" />
              <span className="font-bold text-stone-700">Reserved</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-stone-900 ring-2 ring-stone-200" />
              <span className="font-bold text-stone-700">Occupied</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-stone-500 font-medium">
            <Info className="h-3.5 w-3.5 text-amber-600" />
            <span>Click any table below to configure date, time &amp; book</span>
          </div>
        </div>

        {/* Main Floor Blueprint Container */}
        <div className="relative z-10 min-w-[700px] space-y-6">

          {/* Top Architectural Zone: Entrance & Espresso Bar */}
          <div className="grid grid-cols-12 gap-4 items-center">
            {/* Entrance Landmark */}
            <div className="col-span-4 rounded-2xl border border-dashed border-stone-300 bg-stone-100/80 p-3 text-center">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 uppercase tracking-wider">
                <DoorOpen className="h-4 w-4 text-amber-700" />
                <span>Main Entrance &amp; Patio Porch</span>
              </div>
            </div>

            {/* Espresso Bar & Counter */}
            <div className="col-span-8 rounded-2xl border-2 border-stone-800 bg-stone-900 text-stone-100 p-3.5 shadow-md flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500 text-stone-950 font-black">
                  <Coffee className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-extrabold text-amber-400 tracking-wide uppercase block">
                    Barista Counter &amp; Bakery Display
                  </span>
                  <span className="text-[11px] text-stone-300">
                    Handcrafted Espresso, Fresh Pastries &amp; Kitchen Pick-up
                  </span>
                </div>
              </div>
              <span className="rounded-full bg-stone-800 text-amber-300 text-[10px] font-bold px-2.5 py-1">
                Order Point
              </span>
            </div>
          </div>

          {/* Divided Dining Rooms Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Area 1: Main Dining Room & Garden (Tables 1 - 4) */}
            {(areaFilter === 'all' || areaFilter === 'normal') && (
              <div className="rounded-3xl border-2 border-emerald-200/90 bg-emerald-50/30 p-5 space-y-5 transition-all shadow-xs">
                {/* Area Header */}
                <div className="flex items-center justify-between border-b border-emerald-200/80 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base">🌿</span>
                      <h4 className="font-display font-extrabold text-stone-900 text-sm sm:text-base">
                        Main Dining &amp; Garden View
                      </h4>
                    </div>
                    <p className="text-[11px] text-stone-600 mt-0.5">
                      Bright, airy café space with natural daylight, bistro seating, and garden scenery.
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 shrink-0">
                    Tables 1 - 4
                  </span>
                </div>

                {/* Tables Grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-8 py-3 place-items-center">
                  {mainDiningTables.map(renderTable)}
                </div>

                <div className="pt-2 text-center text-[11px] text-emerald-800 font-semibold flex items-center justify-center gap-1.5">
                  <span>🍃</span>
                  <span>Perfect for casual brunch, friendly catch-ups, and afternoon coffee</span>
                </div>
              </div>
            )}

            {/* Area 2: Air-Conditioned Studio Room (Tables 5 - 8) */}
            {(areaFilter === 'all' || areaFilter === 'airconditioned') && (
              <div className="rounded-3xl border-2 border-sky-200/90 bg-sky-50/30 p-5 space-y-5 transition-all shadow-xs">
                {/* Area Header */}
                <div className="flex items-center justify-between border-b border-sky-200/80 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base">❄️</span>
                      <h4 className="font-display font-extrabold text-stone-900 text-sm sm:text-base">
                        Air-Conditioned Studio Lounge
                      </h4>
                    </div>
                    <p className="text-[11px] text-stone-600 mt-0.5">
                      Cool temperature, quiet ambiance, power outlets, and executive group tables.
                    </p>
                  </div>
                  <span className="rounded-full bg-sky-100 text-sky-800 border border-sky-200 text-[10px] font-bold px-2.5 py-0.5 shrink-0">
                    Tables 5 - 8
                  </span>
                </div>

                {/* Tables Grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-8 py-3 place-items-center">
                  {airconTables.map(renderTable)}
                </div>

                <div className="pt-2 text-center text-[11px] text-sky-800 font-semibold flex items-center justify-center gap-1.5">
                  <Wind className="h-3.5 w-3.5" />
                  <span>Climate-controlled • Fast Wi-Fi • Dedicated Power Outlets</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Architectural Landmark: Restrooms & Garden Deck */}
          <div className="grid grid-cols-12 gap-4 items-center pt-2">
            <div className="col-span-8 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/50 p-2.5 text-center">
              <span className="text-[11px] font-bold text-emerald-800">
                🌿 Outdoor Garden Terrace &amp; Greenery Wall
              </span>
            </div>
            <div className="col-span-4 rounded-2xl border border-stone-200 bg-stone-100/90 p-2.5 text-center">
              <span className="text-[11px] font-bold text-stone-600">
                🚻 Restrooms &amp; Wash Area
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
