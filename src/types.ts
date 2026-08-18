export interface User {
  id: number;
  employeeId: string;
  username: string;
  fullName: string;
  name?: string;
  role: 'cashier' | 'admin';
  status: 'active' | 'inactive';
  lastLogin?: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  sortOrder: number;
  status: 'active' | 'inactive';
}

export type TemperatureType = 'hot' | 'iced' | 'cold' | 'room temp' | 'both' | 'blended' | 'blended iced';

export interface MenuItem {
  id: number;
  categoryId: number;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  temperature: TemperatureType;
  isBestSeller: boolean;
  isAvailable: boolean;
  quantity: number;
  sortOrder: number;
}

export interface Table {
  id: number;
  tableNumber: number;
  capacity: number;
  area: 'normal' | 'airconditioned';
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  currentOrderId?: number | null;
}

export interface CustomerAccount {
  id: number;
  fullName: string;
  email: string;
  contactNumber: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Reservation {
  id: number;
  reservationCode: string;
  tableId: number;
  tableNumber?: number;
  customerId?: number | null;
  customerName: string;
  contactNumber: string;
  guestCount: number;
  reservationAt: string; // ISO or YYYY-MM-DD HH:mm
  notes?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: string;
}

export interface OrderItem {
  id?: number;
  menuItemId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specialInstructions?: string;
  imageUrl?: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  channel?: 'in_store' | 'online';
  tableId?: number | null;
  tableNumber?: number | null;
  customerId?: number | null;
  customerName?: string;
  orderType: 'dine_in' | 'take_away' | 'delivery';
  paymentMethod: 'cash' | 'card' | 'gcash';
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  discountAmount: number;
  discountType?: 'none' | 'senior_pwd' | 'custom';
  discountPercent?: number;
  amountPaid?: number;
  changeAmount?: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  cashierId: number;
  cashierName: string;
  items: OrderItem[];
  createdAt: string;
}

export interface TimeBasedMenu {
  title: string;
  time: string;
  focus: string;
  start: string;
  end: string;
  item_names: string[];
}

export interface StoreSettings {
  tax_rate: number;
  currency: string;
  shop_name: string;
  shop_address: string;
  shop_phone: string;
  receipt_footer: string;
  business_hours: string;
  time_based_menus: TimeBasedMenu[];
}

export interface ChatIntent {
  tag: string;
  patterns: string[];
  keywords: string[];
  response: string;
}

export interface CartItem {
  item: MenuItem;
  quantity: number;
  specialInstructions?: string;
}

export interface Discount {
  id: string;
  name: string;
  code?: string;
  type: 'percent' | 'fixed';
  value: number;
  description?: string;
  isSystem?: boolean;
  requiresId?: boolean;
}

