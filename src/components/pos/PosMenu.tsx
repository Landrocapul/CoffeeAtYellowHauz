import React, { useState, useMemo } from 'react';
import {
  Category,
  MenuItem,
  CartItem,
  Order,
  User,
  Table,
  StoreSettings,
  Discount,
} from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
import { DiscountModal } from './DiscountModal';
import { TableSelectModal } from './TableSelectModal';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Percent,
  Check,
  X,
  CreditCard,
  Banknote,
  QrCode,
  Flame,
  Snowflake,
  Sun,
  User as UserIcon,
  Printer,
  Sparkles,
  Layers,
  Coffee,
  Utensils,
  Egg,
  Soup,
  Pizza,
  Sandwich,
  Cake,
  GlassWater,
  IceCream,
  Citrus,
  Milk,
  Leaf,
  CookingPot,
  CupSoda,
  Delete,
  Ticket,
  Tag,
} from 'lucide-react';

interface PosMenuProps {
  categories: Category[];
  menuItems: MenuItem[];
  settings: StoreSettings;
  activeStaff: User;
  onOrderComplete: (order: Order) => void;
}

export const PosMenu: React.FC<PosMenuProps> = ({
  categories,
  menuItems,
  settings,
  activeStaff,
  onOrderComplete,
}) => {
  const { showAlert } = useModal();
  const [categoryType, setCategoryType] = useState<'drinks' | 'food'>('drinks');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>(9);
  const [selectedTemp, setSelectedTemp] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  // Order Details State
  const [orderType, setOrderType] = useState<'dine_in' | 'take_away' | 'delivery'>('dine_in');
  const [selectedTable, setSelectedTable] = useState<number | ''>('');
  const [customerName, setCustomerName] = useState('');

  // Discount & Coupon State
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);
  const [seniorPwdIdNumber, setSeniorPwdIdNumber] = useState<string>('');
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);

  // Payment Tender Modal
  const [isTenderModalOpen, setIsTenderModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gcash' | 'card'>('cash');
  const [amountPaidInput, setAmountPaidInput] = useState('');

  const tables = useMemo(() => AppStore.getTables(), []);

  // Separate Drinks vs Food categories
  const isDrinkCategory = (cat: Category) => {
    const id = cat.id;
    if (id >= 9 && id <= 17) return true;
    const n = (cat.name || '').toLowerCase();
    const icon = (cat.icon || '').toLowerCase();
    return (
      icon.includes('coffee') ||
      icon.includes('drink') ||
      icon.includes('tea') ||
      icon.includes('cup') ||
      icon.includes('glass') ||
      icon.includes('water') ||
      icon.includes('soda') ||
      icon.includes('milk') ||
      icon.includes('citrus') ||
      icon.includes('leaf') ||
      n.includes('coffee') ||
      n.includes('drink') ||
      n.includes('tea') ||
      n.includes('shake') ||
      n.includes('rocks') ||
      n.includes('refresher') ||
      n.includes('beverage') ||
      n.includes('juice') ||
      n.includes('smoothie') ||
      n.includes('frappe') ||
      n.includes('brew') ||
      n.includes('soda')
    );
  };

  const foodCategories = useMemo(() => {
    return categories.filter((c) => !isDrinkCategory(c));
  }, [categories]);

  const drinkCategories = useMemo(() => {
    return categories.filter((c) => isDrinkCategory(c));
  }, [categories]);

  const currentCategoriesList = categoryType === 'drinks' ? drinkCategories : foodCategories;

  // Category Icon resolver matching design
  const renderCategoryIcon = (categoryName: string, isDrink: boolean, iconName?: string) => {
    const name = (categoryName || '').toLowerCase();
    const ic = (iconName || '').toLowerCase();

    if (ic === 'coffee' || name.includes('hot coffee') || (isDrink && name.includes('coffee') && !name.includes('blended'))) {
      return <Coffee className="h-4 w-4 shrink-0" />;
    }
    if (ic === 'glasswater' || ic === 'glass' || name.includes('on the rocks')) {
      return <GlassWater className="h-4 w-4 shrink-0" />;
    }
    if (ic === 'cupsoda' || name.includes('blended coffee') || name.includes('soda') || name.includes('frappe')) {
      return <CupSoda className="h-4 w-4 shrink-0" />;
    }
    if (ic === 'icecream' || name.includes('cream blended') || name.includes('ice cream')) {
      return <IceCream className="h-4 w-4 shrink-0" />;
    }
    if (ic === 'flame' || name.includes('hot drink') || name.includes('flame')) {
      return <Flame className="h-4 w-4 shrink-0" />;
    }
    if (ic === 'citrus' || name.includes('refresher') || name.includes('citrus') || name.includes('juice')) {
      return <Citrus className="h-4 w-4 shrink-0" />;
    }
    if (ic === 'milk' || name.includes('milkshake') || name.includes('shake') || name.includes('milk')) {
      return <Milk className="h-4 w-4 shrink-0" />;
    }
    if (ic === 'leaf' || name.includes('milk tea') || name.includes('tea') || name.includes('matcha')) {
      return <Leaf className="h-4 w-4 shrink-0" />;
    }
    if (
      name.includes('drink add-on') ||
      name.includes('add-on') ||
      name.includes('addon') ||
      name.includes('plus')
    ) {
      return <Plus className="h-4 w-4 shrink-0" />;
    }

    if (ic === 'egg' || name.includes('breakfast') || name.includes('egg')) {
      return <Egg className="h-4 w-4 shrink-0" />;
    }
    if (ic === 'utensils' || name.includes('appetizer')) {
      return <Utensils className="h-4 w-4 shrink-0" />;
    }
    if (ic === 'soup' || name.includes('meal') || name.includes('soup') || name.includes('rice')) {
      return <Soup className="h-4 w-4 shrink-0" />;
    }
    if (ic === 'cookingpot' || name.includes('pasta') || name.includes('noodle')) {
      return <CookingPot className="h-4 w-4 shrink-0" />;
    }
    if (ic === 'pizza' || name.includes('pizza')) {
      return <Pizza className="h-4 w-4 shrink-0" />;
    }
    if (ic === 'sandwich' || name.includes('sandwich') || name.includes('bread') || name.includes('toast')) {
      return <Sandwich className="h-4 w-4 shrink-0" />;
    }
    if (ic === 'cake' || name.includes('cake') || name.includes('pastr') || name.includes('dessert') || name.includes('bakery')) {
      return <Cake className="h-4 w-4 shrink-0" />;
    }

    return isDrink ? <Coffee className="h-4 w-4 shrink-0" /> : <Utensils className="h-4 w-4 shrink-0" />;
  };

  // Filter Items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (!item.isAvailable) return false;
      
      if (selectedCategory !== 'all') {
        if (item.categoryId !== selectedCategory) return false;
      } else {
        const cat = categories.find((c) => c.id === item.categoryId);
        if (cat) {
          const isDrink = isDrinkCategory(cat);
          if (categoryType === 'drinks' && !isDrink) return false;
          if (categoryType === 'food' && isDrink) return false;
        }
      }

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
  }, [menuItems, categories, selectedCategory, categoryType, selectedTemp, searchQuery]);

  // Cart operations
  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const idx = prev.findIndex((ci) => ci.item.id === item.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((ci) => {
          if (ci.item.id === itemId) {
            const nextQty = ci.quantity + delta;
            return nextQty > 0 ? { ...ci, quantity: nextQty } : null;
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
    setSelectedDiscount(null);
    setSeniorPwdIdNumber('');
    setAmountPaidInput('');
  };

  // Financial Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, ci) => acc + ci.item.price * ci.quantity, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    if (!selectedDiscount) return 0;
    if (selectedDiscount.type === 'percent') {
      return (subtotal * selectedDiscount.value) / 100;
    }
    return Math.min(subtotal, selectedDiscount.value);
  }, [selectedDiscount, subtotal]);

  const discountPercent =
    selectedDiscount?.type === 'percent' ? selectedDiscount.value : 0;

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxRate = settings.tax_rate;
  const taxAmount = (taxableAmount * taxRate) / 100;
  const totalAmount = taxableAmount + taxAmount;

  const tenderedNumber = Number(amountPaidInput) || 0;
  const changeAmount = Math.max(0, tenderedNumber - totalAmount);

  const handleAddPredeterminedAmount = (bill: number) => {
    const currentNum = parseFloat(amountPaidInput) || 0;
    // If the input currently matches the exact default totalAmount, replace with the first tapped bill
    if (amountPaidInput === totalAmount.toFixed(2) && totalAmount !== bill) {
      setAmountPaidInput(String(bill));
      return;
    }
    const nextVal = currentNum + bill;
    setAmountPaidInput(Number.isInteger(nextVal) ? String(nextVal) : nextVal.toFixed(2));
  };

  const handleNumpadInput = (key: string) => {
    if (key === 'CLEAR') {
      setAmountPaidInput('');
      return;
    }
    if (key === 'BACKSPACE') {
      setAmountPaidInput((prev) => prev.slice(0, -1));
      return;
    }
    if (key === 'EXACT') {
      setAmountPaidInput(totalAmount.toFixed(2));
      return;
    }

    setAmountPaidInput((prev) => {
      // If input was exact default from opening tender and user starts typing fresh on numpad
      if (prev === totalAmount.toFixed(2) && totalAmount !== 0) {
        if (key === '.') return '0.';
        if (key === '00') return '0';
        return key;
      }
      if (key === '.') {
        if (prev.includes('.')) return prev;
        return prev ? `${prev}.` : '0.';
      }
      if (key === '00') {
        if (!prev || prev === '0') return '0';
        return prev + '00';
      }
      if (prev === '0') return key;
      return prev + key;
    });
  };

  const openTender = () => {
    if (cart.length === 0) return;
    if (orderType === 'dine_in' && !selectedTable) {
      setIsTableModalOpen(true);
      return;
    }
    setAmountPaidInput(totalAmount.toFixed(2));
    setIsTenderModalOpen(true);
  };

  const handleProcessOrder = () => {
    if (paymentMethod === 'cash' && tenderedNumber < totalAmount) {
      showAlert({
        title: 'Insufficient Payment',
        message: `Tendered cash (₱${tenderedNumber.toFixed(2)}) is less than total amount due (₱${totalAmount.toFixed(2)}).`,
        type: 'error',
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
      channel: 'in_store',
      tableId: orderType === 'dine_in' && selectedTable ? Number(selectedTable) : null,
      tableNumber: orderType === 'dine_in' && selectedTable ? Number(selectedTable) : null,
      customerId: null,
      customerName: customerName.trim()
        ? (seniorPwdIdNumber ? `${customerName.trim()} [ID: ${seniorPwdIdNumber}]` : customerName.trim())
        : (seniorPwdIdNumber ? `Walk-in Guest [ID: ${seniorPwdIdNumber}]` : 'Walk-in Guest'),
      orderType,
      paymentMethod,
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      discountAmount,
      discountType: selectedDiscount ? (selectedDiscount.isSystem ? selectedDiscount.id : 'custom') : 'none',
      discountPercent,
      amountPaid: paymentMethod === 'cash' ? tenderedNumber : totalAmount,
      changeAmount: paymentMethod === 'cash' ? changeAmount : 0,
      status: 'completed',
      cashierId: activeStaff?.id ?? 2,
      cashierName: activeStaff?.fullName || activeStaff?.name || 'Staff Member',
      items: orderItems,
    });

    clearCart();
    setIsTenderModalOpen(false);
    onOrderComplete(newOrder);
  };

  return (
    <div className="grid h-[calc(100vh-140px)] min-h-[600px] grid-cols-1 lg:grid-cols-[1.55fr_.85fr] gap-4">
      {/* Left: Product Catalog with Vertical Categories */}
      <div className="flex rounded-3xl border border-stone-200 bg-white shadow-xs overflow-hidden">
        {/* Vertical Category Navigation on the Left */}
        <div className="w-40 sm:w-48 lg:w-52 shrink-0 border-r border-stone-200/90 bg-stone-50/70 flex flex-col h-full">
          {/* Segmented Pill Toggle: Drinks vs Food */}
          <div className="p-2.5 pb-1.5">
            <div className="grid grid-cols-2 rounded-2xl bg-white p-1 border border-stone-200 shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  setCategoryType('drinks');
                  const firstDrink = drinkCategories[0];
                  if (firstDrink) {
                    setSelectedCategory(firstDrink.id);
                  }
                }}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black transition-all duration-150 ${
                  categoryType === 'drinks'
                    ? 'bg-[#f5b82e] text-stone-950 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'
                }`}
              >
                <Coffee className="h-4 w-4 shrink-0" />
                <span>Drinks</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCategoryType('food');
                  const firstFood = foodCategories[0];
                  if (firstFood) {
                    setSelectedCategory(firstFood.id);
                  }
                }}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black transition-all duration-150 ${
                  categoryType === 'food'
                    ? 'bg-[#f5b82e] text-stone-950 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'
                }`}
              >
                <Utensils className="h-4 w-4 shrink-0" />
                <span>Food</span>
              </button>
            </div>
          </div>

          {/* Vertical Category Buttons List */}
          <div className="flex-1 overflow-y-auto p-2.5 pt-1 space-y-2">
            {currentCategoriesList.map((cat) => {
              const isSelected = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full flex items-center gap-2.5 text-left rounded-2xl px-3.5 py-3 text-xs font-extrabold transition-all duration-150 border ${
                    isSelected
                      ? 'bg-[#f5b82e] text-stone-950 border-[#f5b82e] shadow-xs'
                      : 'bg-white text-stone-800 border-stone-200/90 hover:bg-stone-100/80 hover:border-stone-300'
                  }`}
                >
                  <span className={isSelected ? 'text-stone-950' : 'text-stone-800'}>
                    {renderCategoryIcon(cat.name, categoryType === 'drinks', cat.icon)}
                  </span>
                  <span className="truncate flex-1 tracking-tight">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Area: Search, Temperature Filters & Menu Items Grid */}
        <div className="flex-1 flex flex-col p-3 sm:p-4 overflow-hidden min-w-0">
          {/* Search and Filters */}
          <div className="space-y-2.5 pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search menu items..."
                  className="w-full rounded-xl border border-stone-300 bg-stone-50 pl-9 pr-8 py-2 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl shrink-0">
                <button
                  onClick={() => setSelectedTemp('all')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                    selectedTemp === 'all'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setSelectedTemp('hot')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                    selectedTemp === 'hot'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-stone-600'
                  }`}
                >
                  Hot
                </button>
                <button
                  onClick={() => setSelectedTemp('cold')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                    selectedTemp === 'cold'
                      ? 'bg-sky-500 text-white shadow-xs'
                      : 'text-stone-600'
                  }`}
                >
                  Cold
                </button>
              </div>
            </div>

            {/* Category Breadcrumb & Count */}
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span className="font-bold text-stone-800 truncate flex items-center gap-1.5">
                {categoryType === 'drinks' ? (
                  <Coffee className="h-3.5 w-3.5 text-amber-600" />
                ) : (
                  <Utensils className="h-3.5 w-3.5 text-amber-600" />
                )}
                {selectedCategory === 'all'
                  ? `All ${categoryType === 'drinks' ? 'Drinks' : 'Food'}`
                  : categories.find((c) => c.id === selectedCategory)?.name || 'Category'}
              </span>
              <span className="text-[11px] font-mono shrink-0 font-medium bg-stone-100 px-2 py-0.5 rounded-md text-stone-600">
                {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto pt-3 pr-1">
            {filteredItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 text-xs">
                <Sparkles className="h-8 w-8 text-stone-300 mb-2" />
                <p className="font-bold text-stone-600">No menu items found</p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Try selecting another category or clearing your search.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="group flex flex-col justify-between text-left rounded-2xl border border-stone-200 bg-white p-2 sm:p-2.5 shadow-2xs hover:border-amber-400 hover:shadow-md transition active:scale-95"
                  >
                    <div className="relative aspect-4/3 w-full rounded-xl overflow-hidden bg-stone-100 mb-1.5 sm:mb-2">
                      <img
                        src={item.imageUrl || '/images/latte.webp'}
                        alt={item.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition duration-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/latte.webp';
                        }}
                      />
                      <span className="absolute bottom-1 right-1 sm:bottom-1.5 sm:right-1.5 rounded-lg bg-stone-950/90 backdrop-blur-xs px-1.5 sm:px-2 py-0.5 font-mono text-[10px] sm:text-[11px] font-bold text-amber-400">
                        ₱{item.price.toFixed(0)}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-stone-900 line-clamp-1 group-hover:text-amber-800">
                        {item.name}
                      </h4>
                      <div className="mt-0.5 flex items-center justify-between text-[10px] text-stone-500">
                        <span className="capitalize">{item.temperature}</span>
                        <span>Qty: {item.quantity}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Active Ticket / Cart & Payment */}
      <div className="flex flex-col rounded-3xl border border-stone-200 bg-white p-4 sm:p-5 shadow-xs overflow-hidden">
        {/* Ticket Header */}
        <div className="space-y-3 pb-3 border-b border-stone-200">
          <div className="flex items-center justify-between">
            <span className="font-display font-bold text-base text-stone-900">Current Ticket</span>
            <span className="text-[11px] font-bold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-lg">
              Cashier: {(activeStaff?.fullName || activeStaff?.name || 'Staff').split(' ')[0]}
            </span>
          </div>

          {/* Order Type & Table Selection */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setOrderType('dine_in')}
              className={`rounded-xl py-2 text-xs font-bold border transition ${
                orderType === 'dine_in'
                  ? 'bg-amber-500 text-stone-950 border-amber-500 font-extrabold'
                  : 'bg-stone-50 text-stone-700 border-stone-200'
              }`}
            >
              🍽️ Dine-In
            </button>
            <button
              onClick={() => {
                setOrderType('take_away');
                setSelectedTable('');
              }}
              className={`rounded-xl py-2 text-xs font-bold border transition ${
                orderType === 'take_away'
                  ? 'bg-amber-500 text-stone-950 border-amber-500 font-extrabold'
                  : 'bg-stone-50 text-stone-700 border-stone-200'
              }`}
            >
              🛍️ Take-Out
            </button>
            <button
              onClick={() => {
                setOrderType('delivery');
                setSelectedTable('');
              }}
              className={`rounded-xl py-2 text-xs font-bold border transition ${
                orderType === 'delivery'
                  ? 'bg-amber-500 text-stone-950 border-amber-500 font-extrabold'
                  : 'bg-stone-50 text-stone-700 border-stone-200'
              }`}
            >
              🛵 Delivery
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {orderType === 'dine_in' ? (
              <button
                type="button"
                onClick={() => setIsTableModalOpen(true)}
                className="w-full flex items-center gap-1.5 rounded-xl border border-stone-300 bg-stone-50 px-3 py-1.5 text-xs text-stone-900 font-bold hover:border-amber-500 hover:bg-amber-50/40 transition text-left"
              >
                <Utensils className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span className="truncate">
                  {selectedTable ? `Table #${selectedTable}` : 'Select Table'}
                </span>
              </button>
            ) : (
              <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-stone-500 font-medium">
                No Table (Takeaway)
              </div>
            )}

            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Guest Name (Optional)"
              className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto py-2 space-y-2 divide-y divide-stone-100 pr-1">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-stone-400 text-xs">
              <Sparkles className="h-8 w-8 text-stone-300 mb-1" />
              <p className="font-bold text-stone-600">Ticket is empty</p>
              <p className="text-[11px]">Click items from the catalog to add</p>
            </div>
          ) : (
            cart.map((ci) => (
              <div key={ci.item.id} className="pt-2 first:pt-0 flex items-center justify-between gap-2">
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-stone-900 leading-tight">{ci.item.name}</h4>
                  <span className="font-mono text-[11px] text-stone-500">
                    ₱{ci.item.price.toFixed(2)} × {ci.quantity}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex items-center rounded-lg border border-stone-200 bg-stone-50">
                    <button
                      onClick={() => updateQuantity(ci.item.id, -1)}
                      className="p-1 text-stone-600 hover:text-stone-900"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-5 text-center text-xs font-bold text-stone-900">
                      {ci.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(ci.item.id, 1)}
                      className="p-1 text-stone-600 hover:text-stone-900"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <span className="w-14 text-right font-mono text-xs font-bold text-stone-900">
                    ₱{(ci.item.price * ci.quantity).toFixed(2)}
                  </span>

                  <button
                    onClick={() => removeItem(ci.item.id)}
                    className="p-1 text-stone-400 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Discount Selection */}
        <div className="border-t border-stone-200 pt-2 pb-1">
          {selectedDiscount ? (
            <div className="rounded-xl border border-emerald-500 bg-emerald-50/90 p-2 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-600 text-white font-extrabold text-[10px] shrink-0">
                  %
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-emerald-950 truncate">
                      {selectedDiscount.name}
                    </span>
                    <span className="rounded bg-emerald-200 px-1 py-0.2 text-[9px] font-extrabold text-emerald-900 shrink-0">
                      {selectedDiscount.type === 'percent' ? `${selectedDiscount.value}%` : `₱${selectedDiscount.value}`}
                    </span>
                  </div>
                  <div className="text-[10px] text-emerald-700 font-semibold truncate">
                    Saved: -₱{discountAmount.toFixed(2)}
                    {seniorPwdIdNumber && ` • ID: ${seniorPwdIdNumber}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsDiscountModalOpen(true)}
                  className="rounded-lg bg-white border border-emerald-300 px-2 py-1 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 transition"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDiscount(null);
                    setSeniorPwdIdNumber('');
                  }}
                  title="Remove Discount"
                  className="rounded-lg bg-white border border-rose-200 p-1 text-rose-600 hover:bg-rose-50 transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsDiscountModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-amber-50/70 hover:border-amber-300 hover:text-amber-900 py-2 text-xs font-bold text-stone-700 transition active:scale-98"
            >
              <Ticket className="h-4 w-4 text-amber-600" />
              <span>Apply Discount / Coupon</span>
            </button>
          )}
        </div>

        {/* Calculation Summary */}
        <div className="rounded-2xl bg-stone-50 p-3 border border-stone-200/80 space-y-1 text-xs text-stone-600 my-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span className="font-mono">₱{subtotal.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-emerald-700 font-bold">
              <span>
                Discount ({selectedDiscount?.name} - {selectedDiscount?.type === 'percent' ? `${selectedDiscount.value}%` : `₱${selectedDiscount?.value}`}):
              </span>
              <span className="font-mono">-₱{discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>VAT ({taxRate}%):</span>
            <span className="font-mono">₱{taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-sm text-stone-900 pt-1 border-t border-stone-200">
            <span>Total Due:</span>
            <span className="font-mono text-amber-700 font-extrabold text-base">
              ₱{totalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={clearCart}
            disabled={cart.length === 0}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-xs font-bold text-stone-600 hover:bg-stone-100 disabled:opacity-40"
          >
            Clear
          </button>
          <button
            onClick={openTender}
            disabled={cart.length === 0}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-extrabold text-stone-950 shadow-md hover:bg-amber-400 transition disabled:opacity-40 active:scale-98"
          >
            <span>Tender Payment (₱{totalAmount.toFixed(2)})</span>
          </button>
        </div>
      </div>

      {/* Tender Modal */}
      {isTenderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-5 md:p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150 my-auto">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                  Yellow Hauz Register
                </span>
                <h3 className="font-display text-xl font-bold text-stone-900">
                  Payment Tender &amp; Change
                </h3>
              </div>
              <button
                onClick={() => setIsTenderModalOpen(false)}
                className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Total Display */}
            <div className="my-3.5 rounded-2xl bg-stone-950 px-4 py-3 text-center text-white flex items-center justify-between shadow-xs">
              <div className="text-left">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
                  Total Amount Due
                </span>
                <span className="text-xs text-stone-400">
                  {cart.reduce((s, i) => s + i.quantity, 0)} items ({orderType.replace('_', ' ')})
                </span>
              </div>
              <div className="font-mono text-3xl font-extrabold text-white">
                ₱{totalAmount.toFixed(2)}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-2 mb-3.5">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold border transition ${
                  paymentMethod === 'cash'
                    ? 'bg-amber-500 text-stone-950 border-amber-500 font-extrabold shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <Banknote className="h-4 w-4" />
                <span>Cash</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('gcash')}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold border transition ${
                  paymentMethod === 'gcash'
                    ? 'bg-sky-500 text-white border-sky-500 font-extrabold shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <QrCode className="h-4 w-4" />
                <span>GCash QR</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold border transition ${
                  paymentMethod === 'card'
                    ? 'bg-stone-900 text-white border-stone-900 font-extrabold shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <CreditCard className="h-4 w-4" />
                <span>Card</span>
              </button>
            </div>

            {/* Main Content: Left Details & Right Numpad */}
            {paymentMethod === 'cash' ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Left Side: Input, Quick Denominations, & Change */}
                <div className="md:col-span-7 space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                        Amount Tendered (₱)
                      </label>
                      <span className="text-[10px] text-stone-500 font-medium">
                        Bills add up automatically
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-stone-500 text-lg">
                        ₱
                      </span>
                      <input
                        type="text"
                        value={amountPaidInput}
                        onChange={(e) => setAmountPaidInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-2xl border border-stone-300 bg-stone-50 pl-8 pr-4 py-2 text-xl font-mono font-bold text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none text-right shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Quick Bills & Denominations Grid */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-stone-600">
                      <span>Quick Denominations</span>
                      <span className="text-[10px] text-amber-700 font-normal">Tap repeatedly to add</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {[20, 50, 100, 200, 500, 1000].map((bill) => (
                        <button
                          key={bill}
                          type="button"
                          onClick={() => handleAddPredeterminedAmount(bill)}
                          className="rounded-xl border border-stone-200 bg-stone-50 hover:bg-amber-50 hover:border-amber-400 py-2 text-xs font-extrabold text-stone-800 hover:text-amber-950 transition active:scale-95 shadow-2xs font-mono flex items-center justify-center gap-1"
                        >
                          <span className="text-[10px] font-sans text-amber-600 font-bold">+</span>
                          <span>₱{bill}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Live Change Box */}
                  <div className="flex items-center justify-between rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-950">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
                        Change Due
                      </span>
                      <span className="text-[11px] text-emerald-700">
                        {tenderedNumber < totalAmount ? 'Waiting for full tender' : 'Ready to dispense'}
                      </span>
                    </div>
                    <span className={`font-mono text-2xl font-black ${tenderedNumber < totalAmount ? 'text-stone-400' : 'text-emerald-700'}`}>
                      ₱{changeAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Right Side: Tactile POS Numpad */}
                <div className="md:col-span-5 bg-stone-50 border border-stone-200/80 rounded-2xl p-2.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between px-1 mb-1.5">
                    <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                      Keypad
                    </span>
                    <button
                      type="button"
                      onClick={() => handleNumpadInput('CLEAR')}
                      className="text-[10px] font-extrabold text-rose-600 hover:text-rose-700 hover:underline"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {/* Row 1 */}
                    {['7', '8', '9'].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleNumpadInput(n)}
                        className="rounded-xl bg-white border border-stone-200/90 py-2.5 text-base font-mono font-bold text-stone-900 shadow-2xs hover:bg-stone-100 active:bg-amber-100 active:border-amber-400 active:scale-95 transition"
                      >
                        {n}
                      </button>
                    ))}

                    {/* Row 2 */}
                    {['4', '5', '6'].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleNumpadInput(n)}
                        className="rounded-xl bg-white border border-stone-200/90 py-2.5 text-base font-mono font-bold text-stone-900 shadow-2xs hover:bg-stone-100 active:bg-amber-100 active:border-amber-400 active:scale-95 transition"
                      >
                        {n}
                      </button>
                    ))}

                    {/* Row 3 */}
                    {['1', '2', '3'].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleNumpadInput(n)}
                        className="rounded-xl bg-white border border-stone-200/90 py-2.5 text-base font-mono font-bold text-stone-900 shadow-2xs hover:bg-stone-100 active:bg-amber-100 active:border-amber-400 active:scale-95 transition"
                      >
                        {n}
                      </button>
                    ))}

                    {/* Row 4 */}
                    <button
                      type="button"
                      onClick={() => handleNumpadInput('.')}
                      className="rounded-xl bg-white border border-stone-200/90 py-2.5 text-base font-mono font-bold text-stone-900 shadow-2xs hover:bg-stone-100 active:bg-amber-100 active:scale-95 transition"
                    >
                      .
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNumpadInput('0')}
                      className="rounded-xl bg-white border border-stone-200/90 py-2.5 text-base font-mono font-bold text-stone-900 shadow-2xs hover:bg-stone-100 active:bg-amber-100 active:scale-95 transition"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNumpadInput('BACKSPACE')}
                      className="rounded-xl bg-stone-100 border border-stone-200 py-2.5 flex items-center justify-center text-stone-700 shadow-2xs hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 active:scale-95 transition"
                    >
                      <Delete className="h-4 w-4" />
                    </button>

                    {/* Row 5 */}
                    <button
                      type="button"
                      onClick={() => handleNumpadInput('00')}
                      className="rounded-xl bg-white border border-stone-200/90 py-2 text-xs font-mono font-bold text-stone-700 shadow-2xs hover:bg-stone-100 active:bg-amber-100 active:scale-95 transition"
                    >
                      00
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNumpadInput('EXACT')}
                      className="col-span-2 rounded-xl bg-amber-500 border border-amber-600/50 py-2 text-xs font-bold text-stone-950 shadow-xs hover:bg-amber-400 active:scale-95 transition flex items-center justify-center"
                    >
                      Exact (₱{totalAmount.toFixed(2)})
                    </button>
                  </div>
                </div>
              </div>
            ) : paymentMethod === 'gcash' ? (
              <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-6 text-center space-y-3">
                <QrCode className="h-16 w-16 mx-auto text-sky-600" />
                <h4 className="text-sm font-bold text-sky-950">Scan Yellow Hauz Merchant GCash QR</h4>
                <p className="text-xs text-stone-600 max-w-sm mx-auto">
                  Customer will transfer exact <strong className="text-sky-900 font-mono">₱{totalAmount.toFixed(2)}</strong>. Verify the GCash reference number on customer screen before completing.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 text-center space-y-3">
                <CreditCard className="h-16 w-16 mx-auto text-stone-700" />
                <h4 className="text-sm font-bold text-stone-900">Swipe / Tap on POS Card Terminal</h4>
                <p className="text-xs text-stone-600 max-w-sm mx-auto">
                  Insert or tap customer card for <strong className="text-stone-900 font-mono">₱{totalAmount.toFixed(2)}</strong> on the payment terminal.
                </p>
              </div>
            )}

            <div className="mt-4 flex gap-3 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsTenderModalOpen(false)}
                className="rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleProcessOrder}
                className="flex-1 rounded-xl bg-amber-500 py-3 text-sm font-extrabold text-stone-950 shadow-md hover:bg-amber-400 transition active:scale-98"
              >
                Complete Sale &amp; Print Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Selection / Dining Option Modal */}
      <TableSelectModal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        tables={tables}
        selectedTable={selectedTable}
        onSelectTable={(tableNumber) => {
          setSelectedTable(tableNumber);
          setOrderType('dine_in');
          setIsTableModalOpen(false);
          setAmountPaidInput(totalAmount.toFixed(2));
          setIsTenderModalOpen(true);
        }}
        onNoTableNeeded={() => {
          setSelectedTable('');
          setOrderType('take_away');
          setIsTableModalOpen(false);
          setAmountPaidInput(totalAmount.toFixed(2));
          setIsTenderModalOpen(true);
        }}
      />

      {/* Discount & Coupon Modal */}
      <DiscountModal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        subtotal={subtotal}
        appliedDiscount={selectedDiscount}
        customIdNumber={seniorPwdIdNumber}
        onApplyDiscount={(disc, idNum) => {
          setSelectedDiscount(disc);
          if (idNum !== undefined) setSeniorPwdIdNumber(idNum);
        }}
        onRemoveDiscount={() => {
          setSelectedDiscount(null);
          setSeniorPwdIdNumber('');
        }}
      />
    </div>
  );
};
