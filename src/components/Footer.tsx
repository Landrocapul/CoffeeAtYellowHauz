import React, { useState, useEffect } from 'react';
import { StoreSettings } from '../types';
import {
  Coffee,
  Pin,
  PinOff,
  ChevronDown,
  ChevronUp,
  MapPin,
  Phone,
  Clock,
  ExternalLink,
  Store,
} from 'lucide-react';

interface FooterProps {
  settings: StoreSettings;
  appMode: 'customer' | 'staff';
  onSetAppMode: (mode: 'customer' | 'staff') => void;
}

export const Footer: React.FC<FooterProps> = ({
  settings,
  appMode,
  onSetAppMode,
}) => {
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('yellowhauz_footer_pinned');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('yellowhauz_footer_collapsed');
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });

  const [isHoverPeek, setIsHoverPeek] = useState(false);

  // If pinned, it should not be collapsed
  const isExpanded = isPinned || !isCollapsed || isHoverPeek;

  const handleTogglePin = () => {
    setIsPinned((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('yellowhauz_footer_pinned', String(next));
      } catch {
        // ignore
      }
      if (next) {
        setIsCollapsed(false);
        try {
          localStorage.setItem('yellowhauz_footer_collapsed', 'false');
        } catch {
          // ignore
        }
      }
      return next;
    });
  };

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('yellowhauz_footer_collapsed', String(next));
      } catch {
        // ignore
      }
      if (next && isPinned) {
        setIsPinned(false);
        try {
          localStorage.setItem('yellowhauz_footer_pinned', 'false');
        } catch {
          // ignore
        }
      }
      return next;
    });
  };

  return (
    <footer
      onMouseEnter={() => !isPinned && isCollapsed && setIsHoverPeek(true)}
      onMouseLeave={() => setIsHoverPeek(false)}
      className={`border-t border-stone-200 bg-white transition-all duration-300 ${
        isPinned
          ? 'relative text-stone-600'
          : 'fixed bottom-0 left-0 right-0 z-30 shadow-lg backdrop-blur-md bg-white/95 text-stone-600'
      }`}
    >
      {/* Collapsed State Bar (when unpinned and collapsed) */}
      {!isExpanded ? (
        <div className="mx-auto max-w-7xl px-4 sm:px-8 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-stone-700 font-bold">
            <Coffee className="h-4 w-4 text-amber-600" />
            <span className="text-[11px] font-semibold">Coffee at Yellow Hauz</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleCollapse}
              className="flex items-center gap-1 text-[11px] font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-lg transition"
            >
              <ChevronUp className="h-3.5 w-3.5 text-amber-600" />
              <span>Expand Footer</span>
            </button>
            <button
              type="button"
              onClick={handleTogglePin}
              title="Pin Footer"
              className="flex items-center gap-1 text-[11px] font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 p-1.5 rounded-lg transition"
            >
              <Pin className="h-3.5 w-3.5 text-stone-500" />
            </button>
          </div>
        </div>
      ) : (
        /* Expanded Full Footer */
        <div className="mx-auto max-w-7xl px-4 sm:px-8 py-4 sm:py-5 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 text-xs">
          {/* Brand & Identity */}
          <div className="flex items-center gap-2.5 text-stone-800 font-bold">
            <div className="grid h-7 w-7 place-items-center rounded-xl bg-amber-500 text-stone-950 shadow-2xs">
              <Coffee className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-display font-extrabold text-stone-900">
                Coffee at Yellow Hauz
              </div>
              <div className="text-[10px] text-stone-500 font-medium">
                POS &amp; Storefront System
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-stone-500">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-stone-400 shrink-0" />
              <span>{settings.shop_address || 'V. Mapa St, Davao City'}</span>
            </span>
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3 text-stone-400 shrink-0" />
              <span>{settings.shop_phone || '(082) 227-9952'}</span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-stone-400 shrink-0" />
              <span>{settings.business_hours || '8:00 AM - 10:00 PM'}</span>
            </span>
          </div>

          {/* Actions & Pin/Collapse Controls */}
          <div className="flex items-center gap-2">
            {appMode === 'customer' ? (
              <button
                type="button"
                onClick={() => {
                  onSetAppMode('staff');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2.5 py-1.5 rounded-xl transition flex items-center gap-1"
              >
                <Store className="h-3.5 w-3.5" />
                <span>Open Staff POS</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onSetAppMode('customer');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-[11px] font-bold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2.5 py-1.5 rounded-xl transition flex items-center gap-1"
              >
                <span>Customer View</span>
              </button>
            )}

            {/* Collapse / Expand Button */}
            <button
              type="button"
              onClick={handleToggleCollapse}
              title={isCollapsed ? 'Expand Footer' : 'Collapse Footer'}
              className="flex items-center gap-1 text-[11px] font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2.5 py-1.5 rounded-xl transition"
            >
              <ChevronDown className="h-3.5 w-3.5 text-stone-600" />
              <span className="hidden sm:inline">Collapse</span>
            </button>

            {/* Pin / Unpin Button */}
            <button
              type="button"
              onClick={handleTogglePin}
              title={isPinned ? 'Unpin Footer (floating/collapsible)' : 'Pin Footer in place'}
              className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition border ${
                isPinned
                  ? 'bg-amber-500 text-stone-950 border-amber-600/30 shadow-2xs font-extrabold'
                  : 'bg-stone-100 text-stone-600 hover:text-stone-900 border-stone-200'
              }`}
            >
              {isPinned ? (
                <>
                  <Pin className="h-3.5 w-3.5 fill-current" />
                  <span className="hidden sm:inline">Pinned</span>
                </>
              ) : (
                <>
                  <PinOff className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Unpinned</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </footer>
  );
};
