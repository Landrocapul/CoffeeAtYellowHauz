import React, { useState } from 'react';
import { User, CustomerAccount } from '../types';
import {
  Coffee,
  ShoppingBag,
  Calendar,
  User as UserIcon,
  Monitor,
  LayoutGrid,
  ClipboardList,
  BarChart3,
  TrendingUp,
  Package,
  Settings,
  Bot,
  LogOut,
  Sparkles,
  Pin,
  PinOff,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
} from 'lucide-react';

interface NavigationProps {
  appMode: 'customer' | 'staff';
  onSetAppMode: (mode: 'customer' | 'staff') => void;
  customerTab: 'home' | 'menu' | 'reservation' | 'account';
  onSetCustomerTab: (tab: 'home' | 'menu' | 'reservation' | 'account') => void;
  staffTab: 'pos' | 'tables' | 'tickets' | 'reports' | 'analytics' | 'inventory' | 'settings';
  onSetStaffTab: (tab: 'pos' | 'tables' | 'tickets' | 'reports' | 'analytics' | 'inventory' | 'settings') => void;
  activeStaff: User | null;
  activeCustomer: CustomerAccount | null;
  onStaffLogout: () => void;
  onCustomerLoginClick: () => void;
  onOpenChatbot: () => void;
  cartCount: number;
  isPinned: boolean;
  onTogglePin: () => void;
  isNavVisible: boolean;
  onSetNavVisible: (visible: boolean) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  appMode,
  onSetAppMode,
  customerTab,
  onSetCustomerTab,
  staffTab,
  onSetStaffTab,
  activeStaff,
  activeCustomer,
  onStaffLogout,
  onCustomerLoginClick,
  onOpenChatbot,
  cartCount,
  isPinned,
  onTogglePin,
  isNavVisible,
  onSetNavVisible,
}) => {
  const [isHoverPeek, setIsHoverPeek] = useState(false);

  const shouldShowFullNav = isPinned || isNavVisible || isHoverPeek;

  // Active tab label for compact floating indicator
  const activeTabLabel =
    appMode === 'customer'
      ? customerTab === 'home'
        ? 'Home'
        : customerTab === 'menu'
        ? 'Menu & Ordering'
        : customerTab === 'reservation'
        ? 'Reservations'
        : 'My Account'
      : staffTab === 'pos'
      ? 'Register'
      : staffTab === 'tables'
      ? 'Floor Plan'
      : staffTab === 'tickets'
      ? 'Order Tickets'
      : staffTab === 'reports'
      ? 'Sales Reports'
      : staffTab === 'analytics'
      ? 'Analytics'
      : staffTab === 'inventory'
      ? 'Inventory'
      : 'Settings';

  return (
    <>
      {/* Floating Compact Bar when Nav is Hidden/Unpinned */}
      {!shouldShowFullNav && (
        <div className="fixed top-2.5 right-4 z-40 flex items-center gap-1.5 rounded-full bg-stone-900/95 text-white shadow-xl backdrop-blur-md px-3 py-1.5 border border-stone-700/80 animate-in fade-in slide-in-from-top-2 duration-200">
          <button
            onClick={() => onSetNavVisible(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition"
            title="Expand Navigation Bar"
          >
            <Coffee className="h-4 w-4" />
            <span className="hidden sm:inline font-display">Yellow Hauz</span>
            <span className="text-stone-500">•</span>
            <span className="text-white text-[11px] font-sans font-semibold bg-stone-800 px-2 py-0.5 rounded-full">
              {activeTabLabel}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
          </button>

          <div className="h-3.5 w-px bg-stone-700 mx-1" />

          {/* Quick Chatbot */}
          <button
            onClick={onOpenChatbot}
            className="rounded-full p-1 text-amber-400 hover:bg-stone-800 transition"
            title="AI Assistant"
          >
            <Bot className="h-3.5 w-3.5" />
          </button>

          {/* Pin Button */}
          <button
            onClick={() => {
              onTogglePin();
              onSetNavVisible(true);
            }}
            className="flex items-center gap-1 rounded-full bg-amber-500 text-stone-950 px-2.5 py-1 text-[11px] font-extrabold hover:bg-amber-400 shadow-xs transition"
            title="Pin Navigation Bar to keep it permanently visible"
          >
            <Pin className="h-3 w-3 fill-stone-950" />
            <span className="text-[10px]">Pin</span>
          </button>
        </div>
      )}

      {/* Top Edge Hover Reveal Trigger Area when collapsed */}
      {!isPinned && !isNavVisible && (
        <div
          onMouseEnter={() => setIsHoverPeek(true)}
          onMouseLeave={() => setIsHoverPeek(false)}
          className="fixed top-0 left-0 right-0 h-2.5 z-30 cursor-pointer"
          title="Hover to reveal navigation"
        />
      )}

      {/* Full Navigation Header */}
      {shouldShowFullNav && (
        <header
          onMouseEnter={() => {
            if (!isPinned) setIsHoverPeek(true);
          }}
          onMouseLeave={() => {
            if (!isPinned) setIsHoverPeek(false);
          }}
          className={`sticky top-0 z-40 border-b border-stone-200/90 bg-white/95 backdrop-blur-md transition-all duration-200 ${
            !isPinned ? 'shadow-md ring-1 ring-black/5' : ''
          }`}
        >
          {/* Top Banner: Mode switcher, Pin toggle & quick identity */}
          <div className="border-b border-stone-100 bg-stone-900 text-white px-4 sm:px-8 py-2 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 font-display font-bold tracking-tight text-amber-400">
                <Coffee className="h-4 w-4" />
                <span>Coffee at Yellow Hauz</span>
              </div>
              <span className="hidden sm:inline text-stone-500">•</span>
              <span className="hidden sm:inline text-stone-400 text-[11px]">Davao City</span>
              <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Firestore Cloud DB
              </span>
            </div>

            {/* Global Controls & Mode Switcher */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Mode Switcher Pill */}
              <div className="flex items-center rounded-full bg-stone-800 p-0.5 border border-stone-700">
                <button
                  onClick={() => onSetAppMode('customer')}
                  className={`flex items-center gap-1 rounded-full px-2.5 sm:px-3 py-1 text-[11px] font-bold transition ${
                    appMode === 'customer'
                      ? 'bg-amber-500 text-stone-950 shadow-xs'
                      : 'text-stone-300 hover:text-white'
                  }`}
                >
                  <ShoppingBag className="h-3 w-3" />
                  <span className="hidden xs:inline">Customer Store</span>
                </button>
                <button
                  onClick={() => onSetAppMode('staff')}
                  className={`flex items-center gap-1 rounded-full px-2.5 sm:px-3 py-1 text-[11px] font-bold transition ${
                    appMode === 'staff'
                      ? 'bg-amber-500 text-stone-950 shadow-xs'
                      : 'text-stone-300 hover:text-white'
                  }`}
                >
                  <Monitor className="h-3 w-3" />
                  <span className="hidden xs:inline">Staff POS</span>
                </button>
              </div>

              {/* Chatbot Assistant */}
              <button
                onClick={onOpenChatbot}
                className="flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500/30 transition"
              >
                <Bot className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Assistant</span>
              </button>

              <div className="h-4 w-px bg-stone-700 hidden sm:block" />

              {/* Pin / Unpin Navbar Toggle */}
              <button
                onClick={onTogglePin}
                title={
                  isPinned
                    ? 'Navbar is Pinned (always visible). Click to unpin.'
                    : 'Navbar is Unpinned. Click to Pin permanently.'
                }
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border transition ${
                  isPinned
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                    : 'bg-stone-800 text-stone-400 border-stone-700 hover:text-stone-200 hover:bg-stone-700'
                }`}
              >
                {isPinned ? (
                  <>
                    <Pin className="h-3 w-3 fill-amber-300 text-amber-300" />
                    <span className="hidden sm:inline">Pinned</span>
                  </>
                ) : (
                  <>
                    <PinOff className="h-3 w-3" />
                    <span className="hidden sm:inline">Unpinned</span>
                  </>
                )}
              </button>

              {/* Collapse / Hide Navbar Button */}
              <button
                onClick={() => {
                  if (isPinned) {
                    onTogglePin(); // Unpin when collapsing
                  }
                  onSetNavVisible(false);
                  setIsHoverPeek(false);
                }}
                title="Hide Navigation Bar"
                className="flex items-center gap-1 rounded-full bg-stone-800 border border-stone-700 px-2 sm:px-2.5 py-1 text-[11px] font-bold text-stone-300 hover:text-white hover:bg-stone-700 transition"
              >
                <ChevronUp className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Hide</span>
              </button>
            </div>
          </div>

          {/* Main Nav Bar */}
          <div className="mx-auto max-w-7xl px-4 sm:px-8 py-3 flex items-center justify-between">
            {/* Navigation Tabs based on Mode */}
            {appMode === 'customer' ? (
              <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => onSetCustomerTab('home')}
                  className={`rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold transition ${
                    customerTab === 'home'
                      ? 'bg-amber-100 text-amber-900 font-extrabold'
                      : 'text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  Home
                </button>
                <button
                  onClick={() => onSetCustomerTab('menu')}
                  className={`relative rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold transition ${
                    customerTab === 'menu'
                      ? 'bg-amber-100 text-amber-900 font-extrabold'
                      : 'text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <span>Menu &amp; Ordering</span>
                  {cartCount > 0 && (
                    <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-bold text-stone-950">
                      {cartCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => onSetCustomerTab('reservation')}
                  className={`rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold transition ${
                    customerTab === 'reservation'
                      ? 'bg-amber-100 text-amber-900 font-extrabold'
                      : 'text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  Reserve Table
                </button>
              </nav>
            ) : (
              <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {activeStaff && (
                  <>
                    <button
                      onClick={() => onSetStaffTab('pos')}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                        staffTab === 'pos'
                          ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                          : 'text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <Monitor className="h-3.5 w-3.5" />
                      <span>Register</span>
                    </button>
                    <button
                      onClick={() => onSetStaffTab('tables')}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                        staffTab === 'tables'
                          ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                          : 'text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      <span>Floor Plan</span>
                    </button>
                    <button
                      onClick={() => onSetStaffTab('tickets')}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                        staffTab === 'tickets'
                          ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                          : 'text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <ClipboardList className="h-3.5 w-3.5" />
                      <span>Tickets</span>
                    </button>
                    <button
                      onClick={() => onSetStaffTab('reports')}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                        staffTab === 'reports'
                          ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                          : 'text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      <span>Sales</span>
                    </button>
                    <button
                      onClick={() => onSetStaffTab('analytics')}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                        staffTab === 'analytics'
                          ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                          : 'text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>Analytics</span>
                    </button>
                    <button
                      onClick={() => onSetStaffTab('inventory')}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                        staffTab === 'inventory'
                          ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                          : 'text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <Package className="h-3.5 w-3.5" />
                      <span>Inventory</span>
                    </button>
                    {activeStaff.role === 'admin' && (
                      <button
                        onClick={() => onSetStaffTab('settings')}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                          staffTab === 'settings'
                            ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                            : 'text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <Settings className="h-3.5 w-3.5" />
                        <span>Settings</span>
                      </button>
                    )}
                  </>
                )}
              </nav>
            )}

            {/* User Account / Auth Actions */}
            <div className="flex items-center gap-2">
              {appMode === 'customer' ? (
                <div className="flex items-center gap-2">
                  {activeCustomer ? (
                    <button
                      onClick={() => onSetCustomerTab('account')}
                      className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-bold text-stone-800 hover:bg-stone-100"
                    >
                      <div className="grid h-5 w-5 place-items-center rounded-full bg-amber-500 text-[10px] font-extrabold text-stone-950">
                        {(activeCustomer.fullName || 'Customer').charAt(0)}
                      </div>
                      <span>{activeCustomer.fullName ? activeCustomer.fullName.split(' ')[0] : 'Account'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={onCustomerLoginClick}
                      className="flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-stone-800 shadow-xs"
                    >
                      <UserIcon className="h-3.5 w-3.5 text-amber-400" />
                      <span>Customer Sign In</span>
                    </button>
                  )}

                  <button
                    onClick={() => onSetAppMode('staff')}
                    className="hidden sm:flex items-center gap-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-500/25 transition"
                    title="Switch to Staff POS Terminal"
                  >
                    <Monitor className="h-3.5 w-3.5 text-amber-700" />
                    <span>Staff POS</span>
                  </button>
                </div>
              ) : activeStaff ? (
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-block rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-stone-600">
                    {activeStaff.role || 'Staff'} • {(activeStaff.fullName || activeStaff.name || 'Staff').split(' ')[0]}
                  </span>
                  <button
                    onClick={onStaffLogout}
                    className="flex items-center gap-1 rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs font-bold text-stone-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Lock</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onSetAppMode('customer')}
                  className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-100"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>Back to Store</span>
                </button>
              )}
            </div>
          </div>
        </header>
      )}
    </>
  );
};
