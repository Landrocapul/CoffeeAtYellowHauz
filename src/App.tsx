import React, { useState, useEffect, useMemo } from 'react';
import {
  Category,
  MenuItem,
  Order,
  User,
  CustomerAccount,
  StoreSettings,
  Reservation,
} from './types';
import { AppStore } from './services/store';
import { Navigation } from './components/Navigation';
import { CustomerHome } from './components/customer/CustomerHome';
import { CustomerMenu } from './components/customer/CustomerMenu';
import { CustomerReservation } from './components/customer/CustomerReservation';
import { CustomerAccountView } from './components/customer/CustomerAccount';
import { CustomerLoginModal } from './components/customer/CustomerLoginModal';
import { StaffLogin } from './components/pos/StaffLogin';
import { PosMenu } from './components/pos/PosMenu';
import { TableManagement } from './components/pos/TableManagement';
import { TicketManagement } from './components/pos/TicketManagement';
import { SalesReports } from './components/pos/SalesReports';
import { SalesAnalytics } from './components/pos/SalesAnalytics';
import { InventoryManager } from './components/pos/InventoryManager';
import { SettingsManager } from './components/pos/SettingsManager';
import { ReceiptModal } from './components/ReceiptModal';
import { ChatbotModal } from './components/ChatbotModal';
import { Footer } from './components/Footer';
import { Bot, Coffee } from 'lucide-react';
import { ModalProvider } from './context/ModalContext';

export default function App() {
  return (
    <ModalProvider>
      <MainApp />
    </ModalProvider>
  );
}

function MainApp() {
  // App navigation state
  const [appMode, setAppMode] = useState<'customer' | 'staff'>('customer');
  const [customerTab, setCustomerTab] = useState<'home' | 'menu' | 'reservation' | 'account'>(
    'home'
  );
  const [staffTab, setStaffTab] = useState<
    'pos' | 'tables' | 'tickets' | 'reports' | 'analytics' | 'inventory' | 'settings'
  >('pos');

  // Shared store state
  const [categories, setCategories] = useState<Category[]>(() => AppStore.getCategories());
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => AppStore.getMenuItems());
  const [settings, setSettings] = useState<StoreSettings>(() => AppStore.getSettings());
  const [activeStaff, setActiveStaff] = useState<User | null>(() => AppStore.getActiveStaff());
  const [activeCustomer, setActiveCustomer] = useState<CustomerAccount | null>(() =>
    AppStore.getActiveCustomer()
  );

  // Modals
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isCustomerLoginOpen, setIsCustomerLoginOpen] = useState(false);

  // Navigation Pin & Visibility state
  const [isNavPinned, setIsNavPinned] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('yellowhauz_nav_pinned');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [isNavVisible, setIsNavVisible] = useState<boolean>(true);

  const handleToggleNavPin = () => {
    setIsNavPinned((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('yellowhauz_nav_pinned', String(next));
      } catch {
        // ignore
      }
      if (next) {
        setIsNavVisible(true);
      }
      return next;
    });
  };

  // Refresh items whenever necessary
  const refreshAppData = () => {
    setCategories(AppStore.getCategories());
    setMenuItems(AppStore.getMenuItems());
    setSettings(AppStore.getSettings());
    setActiveStaff(AppStore.getActiveStaff());
    setActiveCustomer(AppStore.getActiveCustomer());
  };

  useEffect(() => {
    AppStore.initFirebaseSync();
    const unsubscribe = AppStore.subscribe(() => {
      refreshAppData();
    });
    return () => unsubscribe();
  }, []);

  const bestSellers = useMemo(() => {
    return menuItems.filter((i) => i.isBestSeller && i.isAvailable).slice(0, 6);
  }, [menuItems]);

  const handleStaffLogout = () => {
    AppStore.setActiveStaff(null);
    setActiveStaff(null);
  };

  const handleCustomerLogout = () => {
    AppStore.setActiveCustomer(null);
    setActiveCustomer(null);
    setCustomerTab('home');
  };

  const handleOrderSuccess = (order: Order) => {
    refreshAppData();
    setSelectedReceiptOrder(order);
  };

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950">
      {/* Navigation Bar */}
      <Navigation
        appMode={appMode}
        onSetAppMode={setAppMode}
        customerTab={customerTab}
        onSetCustomerTab={setCustomerTab}
        staffTab={staffTab}
        onSetStaffTab={setStaffTab}
        activeStaff={activeStaff}
        activeCustomer={activeCustomer}
        onStaffLogout={handleStaffLogout}
        onCustomerLoginClick={() => setIsCustomerLoginOpen(true)}
        onOpenChatbot={() => setIsChatbotOpen(true)}
        cartCount={0}
        isPinned={isNavPinned}
        onTogglePin={handleToggleNavPin}
        isNavVisible={isNavVisible}
        onSetNavVisible={setIsNavVisible}
      />

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-8 pt-6 pb-12">
        {appMode === 'customer' ? (
          /* Customer Experience */
          <>
            {customerTab === 'home' && (
              <CustomerHome
                bestSellers={bestSellers}
                settings={settings}
                onNavigateMenu={() => setCustomerTab('menu')}
                onNavigateReservation={() => setCustomerTab('reservation')}
                onAddToCart={(item) => {
                  setCustomerTab('menu');
                }}
              />
            )}

            {customerTab === 'menu' && (
              <CustomerMenu
                categories={categories}
                menuItems={menuItems}
                settings={settings}
                activeCustomer={activeCustomer}
                onOrderSuccess={handleOrderSuccess}
                onRequireLogin={() => setIsCustomerLoginOpen(true)}
              />
            )}

            {customerTab === 'reservation' && (
              <CustomerReservation
                settings={settings}
                activeCustomer={activeCustomer}
                onReservationSuccess={() => refreshAppData()}
              />
            )}

            {customerTab === 'account' && activeCustomer && (
              <CustomerAccountView
                customer={activeCustomer}
                settings={settings}
                onLogout={handleCustomerLogout}
                onViewReceipt={(order) => setSelectedReceiptOrder(order)}
              />
            )}
          </>
        ) : (
          /* Staff POS & Terminal Experience */
          <>
            {!activeStaff ? (
              <StaffLogin onLoginSuccess={(u) => setActiveStaff(u)} />
            ) : (
              <>
                {staffTab === 'pos' && (
                  <PosMenu
                    categories={categories}
                    menuItems={menuItems}
                    settings={settings}
                    activeStaff={activeStaff}
                    onOrderComplete={handleOrderSuccess}
                  />
                )}

                {staffTab === 'tables' && (
                  <TableManagement
                    onViewOrderReceipt={(order) => setSelectedReceiptOrder(order)}
                  />
                )}

                {staffTab === 'tickets' && (
                  <TicketManagement
                    activeStaff={activeStaff}
                    settings={settings}
                    onViewReceipt={(order) => setSelectedReceiptOrder(order)}
                  />
                )}

                {staffTab === 'reports' && (
                  <SalesReports
                    settings={settings}
                    onViewReceipt={(order) => setSelectedReceiptOrder(order)}
                  />
                )}

                {staffTab === 'analytics' && <SalesAnalytics />}

                {staffTab === 'inventory' && <InventoryManager categories={categories} />}

                {staffTab === 'settings' && (
                  <SettingsManager
                    settings={settings}
                    onUpdateSettings={(newSet) => setSettings(newSet)}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Floating Chatbot Assistant Trigger */}
      <button
        onClick={() => setIsChatbotOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-amber-500 px-4 py-3 font-extrabold text-stone-950 shadow-xl shadow-amber-500/30 hover:bg-amber-400 hover:scale-105 active:scale-95 transition"
      >
        <Bot className="h-5 w-5" />
        <span className="text-xs">Ask Assistant</span>
      </button>

      {/* Footer with Pin and Collapse capability */}
      <Footer
        settings={settings}
        appMode={appMode}
        onSetAppMode={setAppMode}
      />

      {/* Modals */}
      {selectedReceiptOrder && (
        <ReceiptModal
          order={selectedReceiptOrder}
          settings={settings}
          onClose={() => setSelectedReceiptOrder(null)}
        />
      )}

      {isChatbotOpen && <ChatbotModal onClose={() => setIsChatbotOpen(false)} />}

      {isCustomerLoginOpen && (
        <CustomerLoginModal
          onClose={() => setIsCustomerLoginOpen(false)}
          onSuccess={(c) => {
            setActiveCustomer(c);
            setCustomerTab('account');
          }}
        />
      )}
    </div>
  );
}
