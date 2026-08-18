import React, { useState, useMemo } from 'react';
import { Category, MenuItem, CartItem, Order, CustomerAccount, StoreSettings } from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  X,
  Check,
  Flame,
  Snowflake,
  Sun,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface CustomerMenuProps {
  categories: Category[];
  menuItems: MenuItem[];
  settings: StoreSettings;
  activeCustomer: CustomerAccount | null;
  onOrderSuccess: (order: Order) => void;
  onRequireLogin: () => void;
}

export const CustomerMenu: React.FC<CustomerMenuProps> = ({
  categories,
  menuItems,
  settings,
  activeCustomer,
  onOrderSuccess,
  onRequireLogin,
}) => {
  const { showAlert } = useModal();
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [selectedTemp, setSelectedTemp] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Checkout Form State
  const [orderType, setOrderType] = useState<'dine_in' | 'take_away' | 'delivery'>('take_away');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gcash' | 'card'>('cash');
  const [customerName, setCustomerName] = useState(activeCustomer?.fullName || '');
  const [customerPhone, setCustomerPhone] = useState(activeCustomer?.contactNumber || '');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [selectedTable, setSelectedTable] = useState<number | ''>('');

  const tables = useMemo(() => AppStore.getTables(), []);

  // Filter items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (!item.isAvailable) return false;
      if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) return false;
      if (selectedTemp !== 'all') {
        if (selectedTemp === 'hot' && !['hot', 'both'].includes(item.temperature)) return false;
        if (selectedTemp === 'cold' && !['cold', 'iced', 'blended', 'both'].includes(item.temperature))
          return false;
        if (selectedTemp === 'room' && item.temperature !== 'room temp') return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [menuItems, selectedCategory, selectedTemp, searchQuery]);

  // Cart operations
  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.item.id === item.id);
      if (existing) {
        return prev.map((ci) =>
          ci.item.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (itemId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((ci) => {
          if (ci.item.id === itemId) {
            const newQty = ci.quantity + delta;
            return newQty > 0 ? { ...ci, quantity: newQty } : null;
          }
          return ci;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeItem = (itemId: number) => {
    setCart((prev) => prev.filter((ci) => ci.item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Cart Totals
  const subtotal = useMemo(() => {
    return cart.reduce((sum, ci) => sum + ci.item.price * ci.quantity, 0);
  }, [cart]);

  const taxRate = settings.tax_rate;
  const taxAmount = (subtotal * taxRate) / 100;
  const totalAmount = subtotal + taxAmount;
  const totalItemCount = cart.reduce((sum, ci) => sum + ci.quantity, 0);

  // Submit Order
  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      showAlert({
        title: 'Name Required',
        message: 'Please enter your name to complete this order.',
        type: 'warning',
      });
      return;
    }
    if (orderType === 'dine_in' && !selectedTable) {
      showAlert({
        title: 'Table Required',
        message: 'Please select a dining table for Dine-In orders.',
        type: 'warning',
      });
      return;
    }

    const orderItems = cart.map((ci) => ({
      menuItemId: ci.item.id,
      name: ci.item.name,
      quantity: ci.quantity,
      unitPrice: ci.item.price,
      totalPrice: ci.item.price * ci.quantity,
      specialInstructions: ci.specialInstructions,
      imageUrl: ci.item.imageUrl,
    }));

    const newOrder = AppStore.createOrder({
      channel: 'online',
      tableId: orderType === 'dine_in' && selectedTable ? Number(selectedTable) : null,
      tableNumber: orderType === 'dine_in' && selectedTable ? Number(selectedTable) : null,
      customerId: activeCustomer?.id || null,
      customerName: customerName.trim(),
      orderType,
      paymentMethod,
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      discountAmount: 0,
      discountType: 'none',
      discountPercent: 0,
      amountPaid: totalAmount,
      changeAmount: 0,
      status: 'pending',
      cashierId: 1,
      cashierName: 'Online Storefront',
      items: orderItems,
    });

    setCart([]);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    onOrderSuccess(newOrder);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-amber-700">
            Freshly Prepared Daily
          </span>
          <h1 className="text-3xl font-extrabold text-stone-900 font-display">
            Yellow Hauz Menu
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Prices are in Philippine Pesos (₱) inclusive of VAT
          </p>
        </div>

        {/* Search & Cart Quick Button */}
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search coffee, breakfast, mains..."
              className="w-full rounded-xl border border-stone-300 bg-white pl-9 pr-4 py-2 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative flex h-10 items-center gap-2 rounded-xl bg-amber-500 px-4 text-xs sm:text-sm font-bold text-stone-950 shadow-md hover:bg-amber-400 transition"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Bag</span>
            {totalItemCount > 0 && (
              <span className="grid h-5 w-5 place-items-center rounded-full bg-stone-950 text-[10px] font-bold text-amber-400">
                {totalItemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Temperature & Preference Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-stone-500 uppercase tracking-wider mr-1">
          Temp:
        </span>
        <button
          onClick={() => setSelectedTemp('all')}
          className={`rounded-full px-3.5 py-1 text-xs font-bold transition ${
            selectedTemp === 'all'
              ? 'bg-stone-900 text-white'
              : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
          }`}
        >
          All Items
        </button>
        <button
          onClick={() => setSelectedTemp('hot')}
          className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1 text-xs font-bold transition ${
            selectedTemp === 'hot'
              ? 'bg-orange-600 text-white'
              : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
          }`}
        >
          <Flame className="h-3.5 w-3.5" />
          Hot &amp; Warm
        </button>
        <button
          onClick={() => setSelectedTemp('cold')}
          className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1 text-xs font-bold transition ${
            selectedTemp === 'cold'
              ? 'bg-sky-600 text-white'
              : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
          }`}
        >
          <Snowflake className="h-3.5 w-3.5" />
          Iced &amp; Blended
        </button>
        <button
          onClick={() => setSelectedTemp('room')}
          className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1 text-xs font-bold transition ${
            selectedTemp === 'room'
              ? 'bg-amber-600 text-white'
              : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
          }`}
        >
          <Sun className="h-3.5 w-3.5" />
          Room Temp / Pastry
        </button>
      </div>

      {/* Category Pills Slider */}
      <div className="overflow-x-auto pb-2 flex gap-2 no-scrollbar">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition shadow-2xs ${
            selectedCategory === 'all'
              ? 'bg-amber-500 text-stone-950 font-extrabold shadow-sm'
              : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
          }`}
        >
          ✨ All Categories ({menuItems.filter((i) => i.isAvailable).length})
        </button>
        {categories.map((cat) => {
          const count = menuItems.filter((i) => i.categoryId === cat.id && i.isAvailable).length;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition shadow-2xs ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-stone-950 font-extrabold shadow-sm'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
              }`}
            >
              <span>{cat.name}</span>
              <span className="text-[10px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Menu Grid */}
      {filteredItems.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-12 text-center">
          <p className="font-display text-lg font-bold text-stone-800">No items match your filter</p>
          <p className="mt-1 text-xs text-stone-500">Try choosing another category or clearing your search.</p>
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSelectedTemp('all');
              setSearchQuery('');
            }}
            className="mt-4 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-stone-950"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xs transition hover:shadow-md hover:border-amber-300"
            >
              <div className="relative aspect-16/11 overflow-hidden bg-stone-100">
                <img
                  src={item.imageUrl || '/images/latte.webp'}
                  alt={item.name}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/latte.webp';
                  }}
                />
                <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                  {item.isBestSeller && (
                    <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-extrabold uppercase text-stone-950 shadow-xs">
                      Best Seller
                    </span>
                  )}
                  <span className="rounded-full bg-stone-900/80 backdrop-blur-xs px-2 py-0.5 text-[9px] font-bold text-white uppercase">
                    {item.temperature}
                  </span>
                </div>
                <div className="absolute bottom-2.5 right-2.5 rounded-xl bg-stone-950/90 px-2.5 py-1 font-mono text-xs font-bold text-amber-400 shadow-xs">
                  ₱{item.price.toFixed(2)}
                </div>
              </div>

              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <h3 className="font-display text-sm sm:text-base font-bold text-stone-900 group-hover:text-amber-800 transition line-clamp-1">
                    {item.name}
                  </h3>
                  <p className="mt-1 text-xs text-stone-600 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
                  <span className="text-[10px] text-stone-400">
                    Stock: {item.quantity}
                  </span>
                  <button
                    onClick={() => addToCart(item)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-stone-950 hover:bg-amber-400 transition active:scale-95 shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cart Drawer / Slide-Over */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          <div className="flex flex-col w-full max-w-md bg-white h-full shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 p-5">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-amber-600" />
                <h3 className="font-display text-lg font-bold text-stone-900">
                  Your Order ({totalItemCount})
                </h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 divide-y divide-stone-100">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
                  <ShoppingBag className="h-12 w-12 text-stone-300 stroke-1 mb-2" />
                  <p className="font-bold text-stone-700 text-sm">Your order bag is empty</p>
                  <p className="text-xs text-stone-500 mt-1">
                    Select mouth-watering items from the menu to start your order.
                  </p>
                </div>
              ) : (
                cart.map((ci) => (
                  <div key={ci.item.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-stone-900">{ci.item.name}</h4>
                      <p className="text-[11px] text-stone-500 font-mono">
                        ₱{ci.item.price.toFixed(2)} × {ci.quantity} = ₱{(ci.item.price * ci.quantity).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center rounded-lg border border-stone-200 bg-stone-50">
                        <button
                          onClick={() => updateQuantity(ci.item.id, -1)}
                          className="p-1 text-stone-600 hover:text-stone-900"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-stone-900">
                          {ci.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(ci.item.id, 1)}
                          className="p-1 text-stone-600 hover:text-stone-900"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(ci.item.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Calculation & Checkout */}
            {cart.length > 0 && (
              <div className="border-t border-stone-200 bg-stone-50/70 p-5 space-y-3">
                <div className="space-y-1 text-xs text-stone-600">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-mono">₱{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VAT ({taxRate}%):</span>
                    <span className="font-mono">₱{taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-stone-900 pt-1 border-t border-stone-200">
                    <span>Total:</span>
                    <span className="font-mono text-amber-700">₱{totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={clearCart}
                    className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-xs font-bold text-stone-600 hover:bg-stone-100 transition"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => {
                      setIsCartOpen(false);
                      setIsCheckoutOpen(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-extrabold text-stone-950 shadow-md hover:bg-amber-400 transition"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-stone-200 my-8">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                  Coffee at Yellow Hauz
                </span>
                <h3 className="text-xl font-bold text-stone-900 font-display">
                  Order Details &amp; Checkout
                </h3>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePlaceOrder} className="mt-5 space-y-4">
              {/* Order Type Tabs */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Order Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderType('dine_in')}
                    className={`rounded-xl py-2.5 text-xs font-bold border transition ${
                      orderType === 'dine_in'
                        ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-xs'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    🍽️ Dine In
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('take_away')}
                    className={`rounded-xl py-2.5 text-xs font-bold border transition ${
                      orderType === 'take_away'
                        ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-xs'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    🛍️ Take Out
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('delivery')}
                    className={`rounded-xl py-2.5 text-xs font-bold border transition ${
                      orderType === 'delivery'
                        ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-xs'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    🛵 Delivery
                  </button>
                </div>
              </div>

              {/* Table Selector for Dine-in */}
              {orderType === 'dine_in' && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Select Table
                  </label>
                  <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(Number(e.target.value))}
                    required
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-2.5 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">-- Choose an Available Table --</option>
                    {tables.map((tbl) => (
                      <option key={tbl.id} value={tbl.tableNumber}>
                        Table #{tbl.tableNumber} ({tbl.area === 'airconditioned' ? 'AC Room' : 'Main Area'}, {tbl.capacity} Seats) - {tbl.status.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Customer Contact */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Juan Dela Cruz"
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-2.5 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+63 912 345 6789"
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-2.5 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {orderType === 'delivery' && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Delivery Address
                  </label>
                  <input
                    type="text"
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="House/Unit, Street, Barangay, Davao City"
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-2.5 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`rounded-xl py-2 text-xs font-bold border transition ${
                      paymentMethod === 'cash'
                        ? 'bg-amber-500 text-stone-950 border-amber-500'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    💵 Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('gcash')}
                    className={`rounded-xl py-2 text-xs font-bold border transition ${
                      paymentMethod === 'gcash'
                        ? 'bg-sky-500 text-white border-sky-500'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    📱 GCash QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`rounded-xl py-2 text-xs font-bold border transition ${
                      paymentMethod === 'card'
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    💳 Card
                  </button>
                </div>
              </div>

              {/* Order Summary Box */}
              <div className="rounded-2xl bg-stone-50 p-4 border border-stone-200 text-xs space-y-1.5">
                <div className="flex justify-between text-stone-600">
                  <span>Items count:</span>
                  <span>{totalItemCount} items</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal:</span>
                  <span>₱{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>VAT ({taxRate}%):</span>
                  <span>₱{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-stone-900 pt-1.5 border-t border-stone-200">
                  <span>Total Due:</span>
                  <span className="font-mono text-amber-700">₱{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-amber-500 py-3 text-sm font-extrabold text-stone-950 shadow-md hover:bg-amber-400 transition active:scale-98"
              >
                Confirm &amp; Place Order (₱{totalAmount.toFixed(2)})
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
