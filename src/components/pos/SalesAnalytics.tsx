import React, { useMemo } from 'react';
import { AppStore } from '../../services/store';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Award,
  Sparkles,
  ShoppingBag,
  Clock,
  ArrowUpRight,
  Store,
  Globe,
} from 'lucide-react';

export const SalesAnalytics: React.FC = () => {
  const orders = useMemo(() => AppStore.getOrders(), []);
  const menuItems = useMemo(() => AppStore.getMenuItems(), []);
  const categories = useMemo(() => AppStore.getCategories(), []);

  const completedOrders = useMemo(() => orders.filter((o) => o.status === 'completed'), [orders]);

  // Aggregate item sales
  const itemSales = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; revenue: number }>();

    for (const order of completedOrders) {
      for (const item of order.items) {
        const existing = map.get(item.name) || { name: item.name, quantity: 0, revenue: 0 };
        existing.quantity += item.quantity;
        existing.revenue += item.totalPrice;
        map.set(item.name, existing);
      }
    }

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [completedOrders]);

  // Aggregate category distribution
  const categorySales = useMemo(() => {
    const catMap = new Map<string, number>();

    for (const order of completedOrders) {
      for (const item of order.items) {
        const menuItem = menuItems.find((m) => m.id === item.menuItemId || m.name === item.name);
        const cat = categories.find((c) => c.id === menuItem?.categoryId);
        const catName = cat?.name || 'Beverages';
        catMap.set(catName, (catMap.get(catName) || 0) + item.totalPrice);
      }
    }

    return Array.from(catMap.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [completedOrders, menuItems, categories]);

  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const avgOrderValue = completedOrders.length ? totalRevenue / completedOrders.length : 0;
  const totalItemsSold = itemSales.reduce((sum, i) => sum + i.quantity, 0);

  // Channel breakdown
  const inStoreOrders = completedOrders.filter(
    (o) => AppStore.getOrderChannel(o) === 'in_store'
  );
  const onlineOrders = completedOrders.filter(
    (o) => AppStore.getOrderChannel(o) === 'online'
  );

  const inStoreRevenue = inStoreOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const onlineRevenue = onlineOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  const inStorePct = totalRevenue > 0 ? Math.round((inStoreRevenue / totalRevenue) * 100) : 0;
  const onlinePct = totalRevenue > 0 ? Math.round((onlineRevenue / totalRevenue) * 100) : 0;

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="border-b border-stone-200 pb-5">
        <span className="text-xs font-bold uppercase tracking-widest text-amber-700">
          Executive Insights
        </span>
        <h2 className="font-display text-2xl font-extrabold text-stone-900">
          Sales &amp; Channel Analytics
        </h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Comparative performance of On-the-Place (In-Store) POS vs Online customer orders.
        </p>
      </div>

      {/* Highlights Bar */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold uppercase">
            <span>Average Order Value (AOV)</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-extrabold text-stone-900 font-mono">
            ₱{avgOrderValue.toFixed(2)}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">Per completed transaction</p>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold uppercase">
            <span>Total Units Sold</span>
            <ShoppingBag className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-extrabold text-stone-900 font-mono">
            {totalItemsSold} Units
          </div>
          <p className="text-[11px] text-stone-500 mt-1">Across all categories</p>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold uppercase">
            <span>#1 Revenue Leader</span>
            <Award className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 font-display text-xl font-bold text-amber-900 line-clamp-1">
            {itemSales[0]?.name || 'Latte'}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            ₱{(itemSales[0]?.revenue || 0).toFixed(2)} generated ({itemSales[0]?.quantity || 0} cups/plates)
          </p>
        </div>
      </div>

      {/* Channel Comparison Section */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div>
            <h3 className="font-display text-base font-bold text-stone-900">
              Channel Volume &amp; Revenue Share
            </h3>
            <p className="text-xs text-stone-500">
              On-the-Place (In-Store Register) vs Online Storefront performance
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-stone-400 font-medium">Total Settled Revenue</span>
            <div className="font-mono text-base font-extrabold text-amber-900">
              ₱{totalRevenue.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* On-the-Place card */}
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500 text-stone-950 font-bold">
                  <Store className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">On-the-Place (In-Store)</h4>
                  <span className="text-[11px] text-stone-500">Dine-in tables &amp; POS walk-in</span>
                </div>
              </div>
              <span className="font-mono text-lg font-extrabold text-amber-950">
                ₱{inStoreRevenue.toFixed(2)}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-stone-600">
                <span>{inStoreOrders.length} Orders</span>
                <span>{inStorePct}% of Revenue</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-amber-200/60">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${inStorePct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Online card */}
          <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-600 text-white font-bold">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">Online Tickets</h4>
                  <span className="text-[11px] text-stone-500">Customer web storefront</span>
                </div>
              </div>
              <span className="font-mono text-lg font-extrabold text-indigo-950">
                ₱{onlineRevenue.toFixed(2)}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-stone-600">
                <span>{onlineOrders.length} Orders</span>
                <span>{onlinePct}% of Revenue</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-indigo-200/60">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${onlinePct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Best Sellers by Revenue Progress Bars */}
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-stone-900">
              Top Selling Products by Revenue
            </h3>
            <span className="text-xs text-stone-500 font-medium">Ranked #1 to #5</span>
          </div>

          <div className="space-y-3">
            {itemSales.slice(0, 6).map((item, idx) => {
              const maxRev = itemSales[0]?.revenue || 1;
              const pct = Math.round((item.revenue / maxRev) * 100);

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-stone-900 flex items-center gap-1.5">
                      <span className="grid h-4 w-4 place-items-center rounded-full bg-stone-100 text-[10px] font-extrabold text-stone-700">
                        {idx + 1}
                      </span>
                      {item.name}
                    </span>
                    <span className="font-mono font-bold text-stone-800">
                      ₱{item.revenue.toFixed(2)}{' '}
                      <span className="text-[10px] font-normal text-stone-400">
                        ({item.quantity} sold)
                      </span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Contribution Distribution */}
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-stone-900">
              Revenue by Category
            </h3>
            <span className="text-xs text-stone-500 font-medium">Department share</span>
          </div>

          <div className="space-y-3">
            {categorySales.slice(0, 6).map((cat, idx) => {
              const pct = totalRevenue > 0 ? Math.round((cat.total / totalRevenue) * 100) : 0;

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-stone-800">{cat.name}</span>
                    <span className="font-mono text-stone-700">
                      ₱{cat.total.toFixed(2)} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full bg-stone-900 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
