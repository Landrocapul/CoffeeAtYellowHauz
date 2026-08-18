import {
  Category,
  MenuItem,
  Table,
  User,
  Order,
  Reservation,
  CustomerAccount,
  StoreSettings,
  ChatIntent,
  Discount,
} from '../types';
import {
  SEED_CATEGORIES,
  SEED_MENU_ITEMS,
  SEED_TABLES,
  SEED_USERS,
  SEED_SETTINGS,
  SEED_INTENTS,
} from '../data/seedData';
import { db } from '../firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';

// Initial sample completed orders for realistic analytics if collection is empty
const INITIAL_ORDERS: Order[] = [
  {
    id: 1001,
    orderNumber: 'YH-20260817-001',
    channel: 'in_store',
    tableId: 1,
    tableNumber: 1,
    customerName: 'Juan Dela Cruz',
    orderType: 'dine_in',
    paymentMethod: 'cash',
    subtotal: 400.0,
    taxRate: 12,
    taxAmount: 48.0,
    totalAmount: 448.0,
    discountAmount: 0,
    discountType: 'none',
    discountPercent: 0,
    amountPaid: 500.0,
    changeAmount: 52.0,
    status: 'completed',
    cashierId: 2,
    cashierName: 'Sheila Mae Aledro',
    items: [
      { menuItemId: 3, name: 'Longganisa', quantity: 1, unitPrice: 230.0, totalPrice: 230.0 },
      { menuItemId: 38, name: 'Latte', quantity: 1, unitPrice: 170.0, totalPrice: 170.0 },
    ],
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    id: 1002,
    orderNumber: 'YH-20260817-002',
    channel: 'online',
    tableId: null,
    customerName: 'Maria Santos',
    orderType: 'take_away',
    paymentMethod: 'gcash',
    subtotal: 510.0,
    taxRate: 12,
    taxAmount: 61.2,
    totalAmount: 571.2,
    discountAmount: 0,
    discountType: 'none',
    discountPercent: 0,
    amountPaid: 571.2,
    changeAmount: 0,
    status: 'completed',
    cashierId: 1,
    cashierName: 'Online Storefront',
    items: [
      { menuItemId: 17, name: 'Pork Adobo Flakes', quantity: 1, unitPrice: 310.0, totalPrice: 310.0 },
      { menuItemId: 39, name: 'Spanish Latte', quantity: 1, unitPrice: 200.0, totalPrice: 200.0 },
    ],
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: 1003,
    orderNumber: 'YH-20260817-003',
    channel: 'in_store',
    tableId: 5,
    tableNumber: 5,
    customerName: 'Carlo Mendoza',
    orderType: 'dine_in',
    paymentMethod: 'card',
    subtotal: 620.0,
    taxRate: 12,
    taxAmount: 74.4,
    totalAmount: 694.4,
    discountAmount: 0,
    discountType: 'none',
    discountPercent: 0,
    amountPaid: 694.4,
    changeAmount: 0,
    status: 'completed',
    cashierId: 2,
    cashierName: 'Sheila Mae Aledro',
    items: [
      { menuItemId: 29, name: 'Grilled Garlic cheese', quantity: 2, unitPrice: 180.0, totalPrice: 360.0 },
      { menuItemId: 41, name: 'Iced Latte', quantity: 1, unitPrice: 180.0, totalPrice: 180.0 },
      { menuItemId: 33, name: 'Tiramisu', quantity: 1, unitPrice: 150.0, totalPrice: 150.0 },
    ],
    createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
  },
];

const INITIAL_RESERVATIONS: Reservation[] = [
  {
    id: 1,
    reservationCode: 'YH-RES-1049',
    tableId: 6,
    tableNumber: 6,
    customerName: 'Atty. Roberto Tan',
    contactNumber: '+63 917 123 4567',
    guestCount: 6,
    reservationAt: new Date(Date.now() + 2 * 3600000).toISOString(),
    notes: 'Family dinner celebration - request quiet corner in Garden section.',
    status: 'confirmed',
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: 2,
    reservationCode: 'YH-RES-1050',
    tableId: 3,
    tableNumber: 3,
    customerName: 'Claire Villanueva',
    contactNumber: '+63 920 987 6543',
    guestCount: 4,
    reservationAt: new Date(Date.now() + 5 * 3600000).toISOString(),
    notes: 'Afternoon meeting & coffee tasting.',
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
];

export const DEFAULT_DISCOUNTS: Discount[] = [
  {
    id: 'pwd',
    name: 'PWD (Persons with Disability)',
    code: 'PWD20',
    type: 'percent',
    value: 20,
    description: '20% statutory discount for PWD ID holders',
    isSystem: true,
    requiresId: true,
  },
  {
    id: 'senior',
    name: 'Senior Citizen',
    code: 'SENIOR20',
    type: 'percent',
    value: 20,
    description: '20% statutory discount for Senior Citizen OSCA ID holders',
    isSystem: true,
    requiresId: true,
  },
  {
    id: 'student',
    name: 'Student Discount',
    code: 'STUDENT10',
    type: 'percent',
    value: 10,
    description: '10% discount for verified student ID holders',
    isSystem: true,
    requiresId: true,
  },
  {
    id: 'employee',
    name: 'Staff & Barista Partner',
    code: 'STAFF30',
    type: 'percent',
    value: 30,
    description: '30% Yellow Hauz employee partner discount',
    isSystem: true,
  },
  {
    id: 'vip',
    name: 'Yellow Hauz VIP Club',
    code: 'VIP15',
    type: 'percent',
    value: 15,
    description: '15% special loyalty club voucher',
    isSystem: false,
  },
];

const STORAGE_KEYS = {
  ITEMS: 'yh_menu_items',
  CATEGORIES: 'yh_categories',
  TABLES: 'yh_tables',
  ORDERS: 'yh_orders',
  RESERVATIONS: 'yh_reservations',
  CUSTOMERS: 'yh_customers',
  SETTINGS: 'yh_settings',
  USERS: 'yh_users',
  ACTIVE_STAFF: 'yh_active_staff',
  ACTIVE_CUSTOMER: 'yh_active_customer',
  DISCOUNTS: 'yh_discounts',
};

// Defensive helper to strip undefined values so Firestore never throws 'Unsupported field value: undefined'
export function cleanForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((v) => cleanForFirestore(v)) as unknown as T;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        res[k] = cleanForFirestore(v);
      }
    }
    return res as T;
  }
  return obj;
}

function getStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, val: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('Storage error:', e);
  }
}

type StoreListener = () => void;

export class AppStore {
  private static listeners: Set<StoreListener> = new Set();
  private static isInitialized = false;

  static subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  static notify(): void {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error('Listener notify error:', e);
      }
    });
  }

  // Initialize real-time Firebase Firestore synchronization
  static initFirebaseSync(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      // 1. Listen to Categories
      onSnapshot(collection(db, 'categories'), (snapshot) => {
        if (!snapshot.empty) {
          const cats = snapshot.docs.map((doc) => doc.data() as Category);
          cats.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
          setStored(STORAGE_KEYS.CATEGORIES, cats);
          this.notify();
        } else {
          // Seed categories to Firestore
          SEED_CATEGORIES.forEach((cat) => {
            setDoc(doc(db, 'categories', String(cat.id)), cleanForFirestore(cat)).catch(() => {});
          });
        }
      });

      // 2. Listen to Menu Items
      onSnapshot(collection(db, 'menu_items'), (snapshot) => {
        if (!snapshot.empty) {
          const items = snapshot.docs.map((doc) => doc.data() as MenuItem);
          // Ensure any new seed items are synced
          const existingIds = new Set(items.map((i) => i.id));
          const missingSeedItems = SEED_MENU_ITEMS.filter((s) => !existingIds.has(s.id));
          if (missingSeedItems.length > 0) {
            missingSeedItems.forEach((item) => {
              items.push(item);
              setDoc(doc(db, 'menu_items', String(item.id)), cleanForFirestore(item)).catch(() => {});
            });
          }
          items.sort((a, b) => a.id - b.id);
          setStored(STORAGE_KEYS.ITEMS, items);
          this.notify();
        } else {
          // Seed menu items
          SEED_MENU_ITEMS.forEach((item) => {
            setDoc(doc(db, 'menu_items', String(item.id)), cleanForFirestore(item)).catch(() => {});
          });
        }
      });

      // 3. Listen to Tables
      onSnapshot(collection(db, 'tables'), (snapshot) => {
        if (!snapshot.empty) {
          const tables = snapshot.docs.map((doc) => doc.data() as Table);
          tables.sort((a, b) => a.tableNumber - b.tableNumber);
          setStored(STORAGE_KEYS.TABLES, tables);
          this.notify();
        } else {
          // Seed tables
          SEED_TABLES.forEach((table) => {
            setDoc(doc(db, 'tables', String(table.id)), cleanForFirestore(table)).catch(() => {});
          });
        }
      });

      // 4. Listen to Orders
      onSnapshot(collection(db, 'orders'), (snapshot) => {
        if (!snapshot.empty) {
          const orders = snapshot.docs.map((doc) => doc.data() as Order);
          orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setStored(STORAGE_KEYS.ORDERS, orders);
          this.notify();
        } else {
          // Seed initial orders
          INITIAL_ORDERS.forEach((o) => {
            setDoc(doc(db, 'orders', String(o.id)), cleanForFirestore(o)).catch(() => {});
          });
        }
      });

      // 5. Listen to Reservations
      onSnapshot(collection(db, 'reservations'), (snapshot) => {
        if (!snapshot.empty) {
          const resList = snapshot.docs.map((doc) => doc.data() as Reservation);
          resList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setStored(STORAGE_KEYS.RESERVATIONS, resList);
          this.notify();
        } else {
          // Seed initial reservations
          INITIAL_RESERVATIONS.forEach((r) => {
            setDoc(doc(db, 'reservations', String(r.id)), cleanForFirestore(r)).catch(() => {});
          });
        }
      });

      // 6. Listen to Store Settings
      onSnapshot(collection(db, 'settings'), (snapshot) => {
        if (!snapshot.empty) {
          const settingsDoc = snapshot.docs.find((d) => d.id === 'general');
          if (settingsDoc) {
            const settings = settingsDoc.data() as StoreSettings;
            setStored(STORAGE_KEYS.SETTINGS, settings);
            this.notify();
          }
        } else {
          setDoc(doc(db, 'settings', 'general'), cleanForFirestore(SEED_SETTINGS)).catch(() => {});
        }
      });

      // 7. Listen to Users
      onSnapshot(collection(db, 'users'), (snapshot) => {
        if (!snapshot.empty) {
          const users = snapshot.docs.map((doc) => doc.data() as User);
          setStored(STORAGE_KEYS.USERS, users);
          this.notify();
        } else {
          SEED_USERS.forEach((u) => {
            setDoc(doc(db, 'users', String(u.id)), cleanForFirestore(u)).catch(() => {});
          });
        }
      });

      // 8. Listen to Discounts & Coupons
      onSnapshot(collection(db, 'discounts'), (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map((doc) => doc.data() as Discount);
          const existingIds = new Set(list.map((d) => d.id));
          DEFAULT_DISCOUNTS.forEach((def) => {
            if (!existingIds.has(def.id)) {
              list.push(def);
            }
          });
          setStored(STORAGE_KEYS.DISCOUNTS, list);
          this.notify();
        } else {
          DEFAULT_DISCOUNTS.forEach((d) => {
            setDoc(doc(db, 'discounts', d.id), cleanForFirestore(d)).catch(() => {});
          });
        }
      });
    } catch (err) {
      console.warn('Firebase sync initialization notice:', err);
    }
  }

  // Categories
  static getCategories(): Category[] {
    return getStored<Category[]>(STORAGE_KEYS.CATEGORIES, SEED_CATEGORIES);
  }

  static saveCategories(cats: Category[]): void {
    setStored(STORAGE_KEYS.CATEGORIES, cats);
    this.notify();
    cats.forEach((c) => {
      setDoc(doc(db, 'categories', String(c.id)), cleanForFirestore(c)).catch(() => {});
    });
  }

  static addCategory(categoryData: Omit<Category, 'id'>): Category {
    const cats = this.getCategories();
    const newId = cats.length ? Math.max(...cats.map((c) => c.id)) + 1 : 1;
    const newCat: Category = {
      ...categoryData,
      id: newId,
      sortOrder: categoryData.sortOrder ?? cats.length + 1,
    };
    cats.push(newCat);
    this.saveCategories(cats);

    setDoc(doc(db, 'categories', String(newCat.id)), cleanForFirestore(newCat)).catch((e) =>
      console.error('Firestore add category error:', e)
    );

    return newCat;
  }

  static updateCategory(id: number, updates: Partial<Category>): Category | null {
    const cats = this.getCategories();
    const idx = cats.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    cats[idx] = { ...cats[idx], ...updates };
    this.saveCategories(cats);

    updateDoc(doc(db, 'categories', String(id)), cleanForFirestore(updates)).catch(() => {
      setDoc(doc(db, 'categories', String(id)), cleanForFirestore(cats[idx])).catch(() => {});
    });

    return cats[idx];
  }

  static deleteCategory(id: number): boolean {
    let cats = this.getCategories();
    const prevLen = cats.length;
    cats = cats.filter((c) => c.id !== id);
    if (cats.length !== prevLen) {
      this.saveCategories(cats);
      deleteDoc(doc(db, 'categories', String(id))).catch(() => {});
      return true;
    }
    return false;
  }

  static reassignCategoryItems(oldCatId: number, newCatId: number): number {
    const items = this.getMenuItems();
    let count = 0;
    items.forEach((item) => {
      if (item.categoryId === oldCatId) {
        item.categoryId = newCatId;
        count++;
        updateDoc(doc(db, 'menu_items', String(item.id)), { categoryId: newCatId }).catch(() => {});
      }
    });
    if (count > 0) {
      this.saveMenuItems(items);
    }
    return count;
  }

  // Menu Items
  static getMenuItems(): MenuItem[] {
    const items = getStored<MenuItem[]>(STORAGE_KEYS.ITEMS, SEED_MENU_ITEMS);
    const existingIds = new Set(items.map((i) => i.id));
    const missing = SEED_MENU_ITEMS.filter((s) => !existingIds.has(s.id));
    if (missing.length > 0) {
      const merged = [...items, ...missing];
      merged.sort((a, b) => a.id - b.id);
      setStored(STORAGE_KEYS.ITEMS, merged);
      return merged;
    }
    return items;
  }

  static saveMenuItems(items: MenuItem[]): void {
    setStored(STORAGE_KEYS.ITEMS, items);
    this.notify();
  }

  static addMenuItem(item: Omit<MenuItem, 'id'>): MenuItem {
    const items = this.getMenuItems();
    const newId = items.length ? Math.max(...items.map((i) => i.id)) + 1 : 1;
    const newItem: MenuItem = { ...item, id: newId };
    items.push(newItem);
    this.saveMenuItems(items);

    // Sync to Firestore
    setDoc(doc(db, 'menu_items', String(newItem.id)), cleanForFirestore(newItem)).catch((e) =>
      console.error('Firestore add error:', e)
    );

    return newItem;
  }

  static updateMenuItem(id: number, updates: Partial<MenuItem>): MenuItem | null {
    const items = this.getMenuItems();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...updates };
    this.saveMenuItems(items);

    // Sync to Firestore
    updateDoc(doc(db, 'menu_items', String(id)), cleanForFirestore(updates)).catch(() => {
      setDoc(doc(db, 'menu_items', String(id)), cleanForFirestore(items[idx])).catch(() => {});
    });

    return items[idx];
  }

  static deleteMenuItem(id: number): boolean {
    let items = this.getMenuItems();
    const prevLen = items.length;
    items = items.filter((i) => i.id !== id);
    if (items.length !== prevLen) {
      this.saveMenuItems(items);
      deleteDoc(doc(db, 'menu_items', String(id))).catch(() => {});
      return true;
    }
    return false;
  }

  // Floor plan tables
  static getTables(): Table[] {
    return getStored<Table[]>(STORAGE_KEYS.TABLES, SEED_TABLES);
  }

  static saveTables(tables: Table[]): void {
    setStored(STORAGE_KEYS.TABLES, tables);
    this.notify();
  }

  static updateTableStatus(tableId: number, status: Table['status'], orderId?: number | null): Table | null {
    const tables = this.getTables();
    const idx = tables.findIndex((t) => t.id === tableId);
    if (idx === -1) return null;
    tables[idx].status = status;
    if (orderId !== undefined) {
      tables[idx].currentOrderId = orderId;
    }
    this.saveTables(tables);

    // Sync table state to Firestore
    setDoc(doc(db, 'tables', String(tableId)), cleanForFirestore(tables[idx])).catch(() => {});

    return tables[idx];
  }

  static getOrderChannel(order: Order): 'online' | 'in_store' {
    if (order.channel === 'online' || order.channel === 'in_store') {
      return order.channel;
    }
    if (
      order.cashierName?.toLowerCase().includes('online') ||
      order.customerId !== null && order.customerId !== undefined
    ) {
      return 'online';
    }
    return 'in_store';
  }

  // Orders
  static getOrders(): Order[] {
    return getStored<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
  }

  static saveOrders(orders: Order[]): void {
    setStored(STORAGE_KEYS.ORDERS, orders);
    this.notify();
  }

  static createOrder(orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>): Order {
    const orders = this.getOrders();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const seq = String(orders.length + 1).padStart(3, '0');
    const orderNumber = `YH-${dateStr}-${seq}`;
    const newId = orders.length ? Math.max(...orders.map((o) => o.id)) + 1 : 1001;

    const channel: 'online' | 'in_store' =
      orderData.channel ||
      (orderData.cashierName?.toLowerCase().includes('online') ? 'online' : 'in_store');

    const newOrder: Order = {
      id: newId,
      orderNumber,
      channel,
      createdAt: new Date().toISOString(),
      tableId: orderData.tableId ?? null,
      tableNumber: orderData.tableNumber ?? null,
      customerId: orderData.customerId ?? null,
      customerName: orderData.customerName || (channel === 'online' ? 'Online Customer' : 'Walk-in Guest'),
      orderType: orderData.orderType || 'dine_in',
      paymentMethod: orderData.paymentMethod || 'cash',
      subtotal: Number(orderData.subtotal) || 0,
      taxRate: Number(orderData.taxRate) || 12,
      taxAmount: Number(orderData.taxAmount) || 0,
      totalAmount: Number(orderData.totalAmount) || 0,
      discountAmount: Number(orderData.discountAmount) || 0,
      discountType: orderData.discountType || 'none',
      discountPercent: Number(orderData.discountPercent) || 0,
      amountPaid: Number(orderData.amountPaid) || 0,
      changeAmount: Number(orderData.changeAmount) || 0,
      status: orderData.status || 'pending',
      cashierId: orderData.cashierId ?? (channel === 'online' ? 1 : 2),
      cashierName: orderData.cashierName || (channel === 'online' ? 'Online Storefront' : 'Staff Member'),
      items: (orderData.items || []).map((oi) => ({
        menuItemId: oi.menuItemId,
        name: oi.name || 'Menu Item',
        quantity: oi.quantity || 1,
        unitPrice: oi.unitPrice || 0,
        totalPrice: oi.totalPrice || (oi.unitPrice || 0) * (oi.quantity || 1),
        specialInstructions: oi.specialInstructions || '',
        imageUrl: oi.imageUrl || '',
      })),
    };

    orders.unshift(newOrder);
    this.saveOrders(orders);

    // Save to Firestore with clean sanitization
    setDoc(doc(db, 'orders', String(newOrder.id)), cleanForFirestore(newOrder)).catch((e) =>
      console.error('Firestore create order error:', e)
    );

    // Deduct stock in items & Firestore
    const items = this.getMenuItems();
    for (const oi of newOrder.items) {
      const match = items.find((i) => i.id === oi.menuItemId);
      if (match) {
        match.quantity = Math.max(0, match.quantity - oi.quantity);
        updateDoc(doc(db, 'menu_items', String(match.id)), { quantity: match.quantity }).catch(
          () => {}
        );
      }
    }
    this.saveMenuItems(items);

    // If dine in, mark table occupied
    if (newOrder.orderType === 'dine_in' && newOrder.tableId) {
      this.updateTableStatus(newOrder.tableId, 'occupied', newOrder.id);
    }

    return newOrder;
  }

  static updateOrderStatus(orderId: number, status: Order['status']): Order | null {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;
    order.status = status;
    this.saveOrders(orders);

    // Firestore sync
    updateDoc(doc(db, 'orders', String(orderId)), { status }).catch(() => {
      setDoc(doc(db, 'orders', String(orderId)), cleanForFirestore(order)).catch(() => {});
    });

    // If order finished or cancelled, free table
    if ((status === 'completed' || status === 'cancelled') && order.tableId) {
      const tables = this.getTables();
      const table = tables.find((t) => t.id === order.tableId);
      if (table && table.currentOrderId === order.id) {
        this.updateTableStatus(table.id, 'available', null);
      }
    }

    return order;
  }

  // Reservations
  static getReservations(): Reservation[] {
    return getStored<Reservation[]>(STORAGE_KEYS.RESERVATIONS, INITIAL_RESERVATIONS);
  }

  static saveReservations(res: Reservation[]): void {
    setStored(STORAGE_KEYS.RESERVATIONS, res);
    this.notify();
  }

  static createReservation(
    data: Omit<Reservation, 'id' | 'reservationCode' | 'createdAt' | 'status'>
  ): Reservation {
    const resList = this.getReservations();
    const newId = resList.length ? Math.max(...resList.map((r) => r.id)) + 1 : 1;
    const code = `YH-RES-${Math.floor(1000 + Math.random() * 9000)}`;

    const newRes: Reservation = {
      ...data,
      id: newId,
      reservationCode: code,
      status: 'pending',
      createdAt: new Date().toISOString(),
      tableId: data.tableId || 1,
      tableNumber: data.tableNumber || 1,
      customerId: data.customerId ?? null,
      customerName: data.customerName || 'Guest',
      contactNumber: data.contactNumber || '+63 900 000 0000',
      guestCount: Number(data.guestCount) || 2,
      reservationAt: data.reservationAt || new Date().toISOString(),
      notes: data.notes || '',
    };

    resList.unshift(newRes);
    this.saveReservations(resList);

    // Firestore sync
    setDoc(doc(db, 'reservations', String(newRes.id)), cleanForFirestore(newRes)).catch((e) =>
      console.error('Firestore create reservation error:', e)
    );

    return newRes;
  }

  static updateReservationStatus(id: number, status: Reservation['status']): Reservation | null {
    const resList = this.getReservations();
    const res = resList.find((r) => r.id === id);
    if (!res) return null;
    res.status = status;
    this.saveReservations(resList);

    // Firestore sync
    updateDoc(doc(db, 'reservations', String(id)), { status }).catch(() => {
      setDoc(doc(db, 'reservations', String(id)), cleanForFirestore(res)).catch(() => {});
    });

    if (status === 'confirmed' && res.tableId) {
      this.updateTableStatus(res.tableId, 'reserved');
    } else if (status === 'cancelled' || status === 'completed') {
      if (res.tableId) {
        const table = this.getTables().find((t) => t.id === res.tableId);
        if (table && table.status === 'reserved') {
          this.updateTableStatus(res.tableId, 'available');
        }
      }
    }

    return res;
  }

  // Store Settings
  static getSettings(): StoreSettings {
    return getStored<StoreSettings>(STORAGE_KEYS.SETTINGS, SEED_SETTINGS);
  }

  static saveSettings(settings: StoreSettings): void {
    setStored(STORAGE_KEYS.SETTINGS, settings);
    this.notify();
    setDoc(doc(db, 'settings', 'general'), cleanForFirestore(settings)).catch(() => {});
  }

  // Users and Auth State
  static getUsers(): User[] {
    return getStored<User[]>(STORAGE_KEYS.USERS, SEED_USERS);
  }

  static getActiveStaff(): User | null {
    return getStored<User | null>(STORAGE_KEYS.ACTIVE_STAFF, null);
  }

  static setActiveStaff(user: User | null): void {
    setStored(STORAGE_KEYS.ACTIVE_STAFF, user);
    this.notify();
  }

  static getActiveCustomer(): CustomerAccount | null {
    return getStored<CustomerAccount | null>(STORAGE_KEYS.ACTIVE_CUSTOMER, null);
  }

  static setActiveCustomer(cust: CustomerAccount | null): void {
    setStored(STORAGE_KEYS.ACTIVE_CUSTOMER, cust);
    this.notify();
  }

  // Chatbot Logic
  static getChatbotResponse(userMessage: string): string {
    const lower = userMessage.toLowerCase().trim();
    if (!lower) return 'How can I help you today with Yellow Hauz orders, menu, or tables?';

    // Check intents by exact pattern or keywords
    for (const intent of SEED_INTENTS) {
      if (intent.patterns.some((p) => lower.includes(p.toLowerCase()))) {
        return intent.response;
      }
    }

    // Check by keyword count
    let bestMatch: ChatIntent | null = null;
    let maxMatches = 0;

    for (const intent of SEED_INTENTS) {
      let count = 0;
      for (const kw of intent.keywords) {
        if (lower.includes(kw.toLowerCase())) count++;
      }
      if (count > maxMatches) {
        maxMatches = count;
        bestMatch = intent;
      }
    }

    if (bestMatch && maxMatches > 0) {
      return bestMatch.response;
    }

    return (
      "I'm here to assist with Coffee at Yellow Hauz! You can ask me about our menu best sellers, table reservations, how to process cash/GCash/card payments, apply Senior/PWD 20% discounts, view sales reports, or check operating hours (7:00 AM - 10:00 PM)."
    );
  }

  // Discounts & Coupons
  static getDiscounts(): Discount[] {
    return getStored<Discount[]>(STORAGE_KEYS.DISCOUNTS, DEFAULT_DISCOUNTS);
  }

  static saveDiscounts(discounts: Discount[]): void {
    setStored(STORAGE_KEYS.DISCOUNTS, discounts);
    this.notify();
  }

  static addDiscount(discountData: Omit<Discount, 'id'> & { id?: string }): Discount {
    const discounts = this.getDiscounts();
    const id = discountData.id || `disc-${Date.now()}`;
    const newDiscount: Discount = {
      ...discountData,
      id,
      isSystem: false,
    };
    discounts.push(newDiscount);
    this.saveDiscounts(discounts);
    setDoc(doc(db, 'discounts', id), cleanForFirestore(newDiscount)).catch((e) =>
      console.error('Firestore save discount error:', e)
    );
    return newDiscount;
  }

  static updateDiscount(id: string, updates: Partial<Discount>): Discount | null {
    const discounts = this.getDiscounts();
    const idx = discounts.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    discounts[idx] = { ...discounts[idx], ...updates };
    this.saveDiscounts(discounts);
    updateDoc(doc(db, 'discounts', id), cleanForFirestore(updates)).catch((e) =>
      console.error('Firestore update discount error:', e)
    );
    return discounts[idx];
  }

  static deleteDiscount(id: string): void {
    const discounts = this.getDiscounts().filter((d) => d.id !== id);
    this.saveDiscounts(discounts);
    deleteDoc(doc(db, 'discounts', id)).catch((e) =>
      console.error('Firestore delete discount error:', e)
    );
  }
}
