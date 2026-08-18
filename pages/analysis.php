<?php
require_once __DIR__ . '/../db.php';

// Check if user is logged in
if (!isLoggedIn()) {
    redirect('index.php');
}

// Check if user has admin access
if (!isAdmin()) {
    redirect('menu.php');
}

// Get current user info
$currentUser = getCurrentUser();

function analyticsUrl(array $overrides = []) {
    $params = array_merge($_GET, $overrides);
    foreach ($params as $key => $value) {
        if ($value === '' || $value === null || ($key === 'category' && (int)$value === 0) || ($key === 'stock_filter' && $value === 'all') || ($key === 'sort' && $value === 'revenue_desc')) {
            unset($params[$key]);
        }
    }
    return 'analysis.php' . (empty($params) ? '' : '?' . http_build_query($params));
}

function percentChange($current, $previous) {
    $current = (float)$current;
    $previous = (float)$previous;
    if ($previous == 0) return $current > 0 ? 100 : 0;
    return round((($current - $previous) / $previous) * 100, 1);
}

$startDate = $_GET['start_date'] ?? date('Y-m-01');
$endDate = $_GET['end_date'] ?? date('Y-m-t');
if (strtotime($startDate) > strtotime($endDate)) {
    [$startDate, $endDate] = [$endDate, $startDate];
}
$startDateTime = $startDate . ' 00:00:00';
$endDateTime = $endDate . ' 23:59:59';
$periodSeconds = max(1, strtotime($endDateTime) - strtotime($startDateTime) + 1);
$previousStartDateTime = date('Y-m-d H:i:s', strtotime($startDateTime) - $periodSeconds);
$previousEndDateTime = date('Y-m-d H:i:s', strtotime($startDateTime) - 1);

$selectedCategoryId = isset($_GET['category']) ? (int)$_GET['category'] : 0;
$searchTerm = sanitize($_GET['search'] ?? '');
$stockFilter = $_GET['stock_filter'] ?? 'all';
$sort = $_GET['sort'] ?? 'revenue_desc';
$allowedStockFilters = ['all', 'available', 'unavailable', 'best_seller', 'low_stock', 'out_of_stock', 'slow_moving'];
$allowedSorts = ['revenue_desc', 'units_desc', 'orders_desc', 'stock_asc', 'share_desc', 'name_asc'];
if (!in_array($stockFilter, $allowedStockFilters, true)) $stockFilter = 'all';
if (!in_array($sort, $allowedSorts, true)) $sort = 'revenue_desc';
$lowStockThreshold = 5;

$stmt = $pdo->query("SELECT id, name FROM categories WHERE status = 'active' ORDER BY sort_order ASC, name ASC");
$categories = $stmt->fetchAll();

$where = [];
$params = [];
if ($selectedCategoryId > 0) {
    $where[] = 'mi.category_id = ?';
    $params[] = $selectedCategoryId;
}
if ($searchTerm !== '') {
    $where[] = '(mi.name LIKE ? OR mi.description LIKE ? OR c.name LIKE ?)';
    $like = '%' . $searchTerm . '%';
    array_push($params, $like, $like, $like);
}
if ($stockFilter === 'available') {
    $where[] = 'mi.is_available = 1';
} elseif ($stockFilter === 'unavailable') {
    $where[] = 'mi.is_available = 0';
} elseif ($stockFilter === 'best_seller') {
    $where[] = 'mi.is_best_seller = 1';
} elseif ($stockFilter === 'low_stock') {
    $where[] = 'mi.quantity > 0 AND mi.quantity <= ?';
    $params[] = $lowStockThreshold;
} elseif ($stockFilter === 'out_of_stock') {
    $where[] = 'mi.quantity <= 0';
}
$whereSql = empty($where) ? '' : 'WHERE ' . implode(' AND ', $where);
$orderSql = [
    'revenue_desc' => 'total_revenue DESC, total_sold DESC',
    'units_desc' => 'total_sold DESC, total_revenue DESC',
    'orders_desc' => 'order_count DESC, total_revenue DESC',
    'stock_asc' => 'mi.quantity ASC, total_sold DESC',
    'share_desc' => 'total_revenue DESC, total_sold DESC',
    'name_asc' => 'mi.name ASC',
][$sort];

$sql = "SELECT 
    mi.id, mi.name, mi.description, mi.category_id, mi.price, mi.quantity, mi.is_available, mi.is_best_seller, c.name as category_name,
    COALESCE(SUM(CASE WHEN o.status = 'completed' AND o.created_at BETWEEN ? AND ? THEN oi.quantity ELSE 0 END), 0) as total_sold,
    COALESCE(SUM(CASE WHEN o.status = 'completed' AND o.created_at BETWEEN ? AND ? THEN oi.total_price ELSE 0 END), 0) as total_revenue,
    COUNT(DISTINCT CASE WHEN o.status = 'completed' AND o.created_at BETWEEN ? AND ? THEN o.id END) as order_count,
    COALESCE(AVG(CASE WHEN o.status = 'completed' AND o.created_at BETWEEN ? AND ? THEN oi.quantity END), 0) as avg_quantity_per_order,
    COALESCE(SUM(CASE WHEN o.status = 'completed' AND o.created_at BETWEEN ? AND ? THEN oi.quantity ELSE 0 END), 0) / GREATEST(1, mi.quantity + COALESCE(SUM(CASE WHEN o.status = 'completed' AND o.created_at BETWEEN ? AND ? THEN oi.quantity ELSE 0 END), 0)) as sell_through_rate,
    0 as revenue_share,
    COALESCE(SUM(CASE WHEN o.status = 'completed' AND o.created_at BETWEEN ? AND ? THEN oi.quantity ELSE 0 END), 0) as previous_sold,
    COALESCE(SUM(CASE WHEN o.status = 'completed' AND o.created_at BETWEEN ? AND ? THEN oi.total_price ELSE 0 END), 0) as previous_revenue
    FROM menu_items mi
    LEFT JOIN categories c ON mi.category_id = c.id
    LEFT JOIN order_items oi ON mi.id = oi.menu_item_id
    LEFT JOIN orders o ON oi.order_id = o.id
    {$whereSql}
    GROUP BY mi.id, mi.name, mi.description, mi.category_id, mi.price, mi.quantity, mi.is_available, mi.is_best_seller, c.name
    ORDER BY {$orderSql}";
$queryParams = [$startDateTime, $endDateTime, $startDateTime, $endDateTime, $startDateTime, $endDateTime, $startDateTime, $endDateTime, $startDateTime, $endDateTime, $startDateTime, $endDateTime, $previousStartDateTime, $previousEndDateTime, $previousStartDateTime, $previousEndDateTime];
$stmt = $pdo->prepare($sql);
$stmt->execute(array_merge($queryParams, $params));
$productAnalytics = $stmt->fetchAll();

$totalRevenue = array_sum(array_map(fn($p) => (float)$p['total_revenue'], $productAnalytics));
$totalUnitsSold = array_sum(array_map(fn($p) => (int)$p['total_sold'], $productAnalytics));
$daysInPeriod = max(1, (int)ceil($periodSeconds / 86400));
foreach ($productAnalytics as &$product) {
    $product['revenue_share'] = $totalRevenue > 0 ? ((float)$product['total_revenue'] / $totalRevenue) * 100 : 0;
    $avgDailySold = ((int)$product['total_sold']) / $daysInPeriod;
    $product['days_of_stock_left'] = $avgDailySold > 0 ? round(((int)$product['quantity']) / $avgDailySold, 1) : null;
    $product['revenue_change'] = percentChange($product['total_revenue'], $product['previous_revenue']);
}
unset($product);
if ($stockFilter === 'slow_moving') {
    $productAnalytics = array_values(array_filter($productAnalytics, fn($p) => (int)$p['total_sold'] === 0 && (int)$p['quantity'] > $lowStockThreshold));
}
usort($productAnalytics, function ($a, $b) use ($sort) {
    if ($sort === 'units_desc') return $b['total_sold'] <=> $a['total_sold'];
    if ($sort === 'orders_desc') return $b['order_count'] <=> $a['order_count'];
    if ($sort === 'stock_asc') return $a['quantity'] <=> $b['quantity'];
    if ($sort === 'share_desc') return $b['revenue_share'] <=> $a['revenue_share'];
    if ($sort === 'name_asc') return strcmp($a['name'], $b['name']);
    return $b['total_revenue'] <=> $a['total_revenue'];
});

$cumulativeRevenue = 0;
foreach ($productAnalytics as &$product) {
    $cumulativeRevenue += (float)$product['total_revenue'];
    $cumulativePercent = $totalRevenue > 0 ? ($cumulativeRevenue / $totalRevenue) * 100 : 0;
    $product['abc_class'] = $cumulativePercent <= 80 ? 'A' : ($cumulativePercent <= 95 ? 'B' : 'C');
}
unset($product);

if (isset($_GET['export']) && $_GET['export'] === 'csv') {
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="product-analytics-' . date('Ymd-His') . '.csv"');
    $output = fopen('php://output', 'w');
    fputcsv($output, ['Product', 'Category', 'Units Sold', 'Orders', 'Revenue', 'Revenue Share', 'Stock', 'Days Stock Left', 'Sell Through', 'ABC Class']);
    foreach ($productAnalytics as $product) {
        fputcsv($output, [$product['name'], $product['category_name'], $product['total_sold'], $product['order_count'], $product['total_revenue'], round($product['revenue_share'], 1) . '%', $product['quantity'], $product['days_of_stock_left'] ?? 'No sales velocity', round($product['sell_through_rate'] * 100, 1) . '%', $product['abc_class']]);
    }
    fclose($output);
    exit;
}

$stmt = $pdo->prepare("SELECT 
    c.id, c.name, COUNT(DISTINCT mi.id) as product_count,
    COALESCE(SUM(CASE WHEN o.status = 'completed' AND o.created_at BETWEEN ? AND ? THEN oi.quantity ELSE 0 END), 0) as total_sold,
    COALESCE(SUM(CASE WHEN o.status = 'completed' AND o.created_at BETWEEN ? AND ? THEN oi.total_price ELSE 0 END), 0) as total_revenue
    FROM categories c
    LEFT JOIN menu_items mi ON c.id = mi.category_id
    LEFT JOIN order_items oi ON mi.id = oi.menu_item_id
    LEFT JOIN orders o ON oi.order_id = o.id
    WHERE c.status = 'active'
    GROUP BY c.id, c.name
    ORDER BY total_revenue DESC");
$stmt->execute([$startDateTime, $endDateTime, $startDateTime, $endDateTime]);
$categoryAnalytics = $stmt->fetchAll();

$topRevenueProduct = $productAnalytics[0] ?? null;
$mostUnitsProduct = empty($productAnalytics) ? null : array_reduce($productAnalytics, fn($carry, $item) => !$carry || $item['total_sold'] > $carry['total_sold'] ? $item : $carry);
$slowMovingProduct = null;
foreach ($productAnalytics as $product) {
    if ((int)$product['total_sold'] === 0 && (int)$product['quantity'] > $lowStockThreshold) {
        $slowMovingProduct = $product;
        break;
    }
}
$outOfStockBestSeller = null;
foreach ($productAnalytics as $product) {
    if ((int)$product['is_best_seller'] === 1 && (int)$product['quantity'] <= 0) {
        $outOfStockBestSeller = $product;
        break;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yellow Hauz POS - Product Analytics</title>
    <link rel="icon" type="image/svg+xml" href="images/favicon.svg">
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,500&display=swap" rel="stylesheet">
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                        serif: ['Playfair Display', 'serif'],
                    },
                    colors: {
                        brand: {
                            DEFAULT: '#FBBF24',
                            light: '#FEF9C3',
                            dark: '#D97706',
                            black: '#171717',
                        },
                        vintage: {
                            paper: '#F5F4F0',
                            border: '#E5E5E5'
                        }
                    }
                }
            }
        }
    </script>
    <style>
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #E5E5E5; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #A3A3A3; }
    </style>
</head>
<body class="bg-[#EAE8E3] h-screen w-screen p-3 font-sans text-brand-black overflow-hidden">

    <div class="bg-vintage-paper w-full h-full rounded-2xl shadow-2xl flex overflow-hidden border border-gray-300 relative">
        
        <!-- LEFT SIDEBAR -->
        <aside id="sidebar" class="w-[80px] bg-white border-r border-vintage-border flex flex-col justify-between py-6 px-4 shrink-0 z-10 transition-all duration-300 ease-in-out">
            <div>
                <!-- Logo -->
                <div class="flex flex-col items-center justify-center mb-10 mt-2 text-center">
                    <span class="font-serif italic text-sm text-gray-500 mb-1">Coffee at</span>
                    <h1 class="font-serif font-bold text-2xl leading-none text-brand-black tracking-tight uppercase">Yellow Hauz</h1>
                    <div class="flex items-center gap-2 mt-2">
                        <div class="h-px w-4 bg-brand"></div>
                        <span class="text-[10px] tracking-[0.2em] text-gray-400 uppercase font-semibold">Since 2007</span>
                        <div class="h-px w-4 bg-brand"></div>
                    </div>
                </div>

                <!-- Navigation -->
                <nav id="navigation" class="space-y-2">
                    <a href="menu.php" class="flex items-center gap-4 text-gray-500 hover:text-brand-black hover:bg-gray-100 px-4 py-3.5 rounded-2xl font-medium transition-all">
                        <i class="fa-solid fa-mug-hot w-5 text-center"></i> <span class="nav-text">Menu</span>
                    </a>
                    <a href="table.php" class="flex items-center gap-4 text-gray-500 hover:text-brand-black hover:bg-gray-100 px-4 py-3.5 rounded-2xl font-medium transition-all">
                        <i class="fa-solid fa-utensils w-5 text-center"></i> <span class="nav-text">Table Services</span>
                    </a>
                    <a href="ticket.php" class="flex items-center gap-4 text-gray-500 hover:text-brand-black hover:bg-gray-100 px-4 py-3.5 rounded-2xl font-medium transition-all">
                        <i class="fa-solid fa-receipt w-5 text-center"></i> <span class="nav-text">Tickets</span>
                    </a>
                    <a href="items.php" class="flex items-center gap-4 text-gray-500 hover:text-brand-black hover:bg-gray-100 px-4 py-3.5 rounded-2xl font-medium transition-all">
                        <i class="fa-solid fa-clipboard-list w-5 text-center"></i> <span class="nav-text">Manage Food Items</span>
                    </a>
                    <a href="sales.php" class="flex items-center gap-4 text-gray-500 hover:text-brand-black hover:bg-gray-100 px-4 py-3.5 rounded-2xl font-medium transition-all">
                        <i class="fa-solid fa-chart-line w-5 text-center"></i> <span class="nav-text">Sales Report</span>
                    </a>
                    <a href="analysis.php" class="flex items-center gap-4 bg-brand-black text-brand px-4 py-3.5 rounded-2xl font-semibold shadow-md transition-all">
                        <i class="fa-solid fa-chart-pie w-5 text-center"></i> <span class="nav-text">Product Analytics</span>
                    </a>
                    <a href="settings.php" class="flex items-center gap-4 text-gray-500 hover:text-brand-black hover:bg-gray-100 px-4 py-3.5 rounded-2xl font-medium transition-all">
                        <i class="fa-solid fa-gear w-5 text-center"></i> <span class="nav-text">Settings</span>
                    </a>
                </nav>
            </div>

            <!-- Bottom Users / Logout -->
            <div class="space-y-4">
                <div class="space-y-3 px-2">
                    <a href="profile.php" class="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-gray-100">
                        <div class="w-8 h-8 rounded-full bg-brand text-brand-black flex items-center justify-center text-xs font-bold relative">
                            <?php echo strtoupper(substr($currentUser['full_name'], 0, 2)); ?>
                            <span class="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                        </div>
                        <span class="text-sm font-medium nav-text"><?php echo htmlspecialchars($currentUser['full_name']); ?></span>
                    </a>
                </div>
                <hr class="border-gray-200">
                <a href="#" onclick="showLogoutModal()" class="flex items-center gap-3 text-gray-500 hover:text-brand-black px-4 py-2 font-medium transition-all">
                    <i class="fa-solid fa-arrow-right-from-bracket"></i> <span class="nav-text">Logout</span>
                </a>
            </div>
        </aside>

        <main class="flex-1 min-w-0 flex flex-col relative bg-vintage-paper">
            <!-- Top Header -->
            <header class="min-h-[88px] flex flex-wrap items-center justify-between gap-4 px-8 py-4 shrink-0 border-b border-gray-200/50">
                <button id="sidebarToggle" class="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-500 hover:text-brand-black">
                    <i class="fa-solid fa-bars"></i>
                </button>
                
                <h2 class="text-2xl font-serif font-bold text-brand-black tracking-wide shrink-0">PRODUCT ANALYTICS</h2>
                
                <div class="flex min-w-0 items-center gap-3">
                    <form method="GET" class="flex items-center gap-2 flex-wrap justify-end">
                        <input type="date" name="start_date" value="<?php echo $startDate; ?>" class="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                        <span class="text-gray-400">to</span>
                        <input type="date" name="end_date" value="<?php echo $endDate; ?>" class="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                        <select name="category" class="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                            <option value="0">All Categories</option>
                            <?php foreach ($categories as $category): ?>
                            <option value="<?php echo (int)$category['id']; ?>" <?php echo $selectedCategoryId === (int)$category['id'] ? 'selected' : ''; ?>><?php echo htmlspecialchars($category['name']); ?></option>
                            <?php endforeach; ?>
                        </select>
                        <select name="stock_filter" class="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                            <option value="all" <?php echo $stockFilter === 'all' ? 'selected' : ''; ?>>All Stock</option>
                            <option value="available" <?php echo $stockFilter === 'available' ? 'selected' : ''; ?>>Available</option>
                            <option value="unavailable" <?php echo $stockFilter === 'unavailable' ? 'selected' : ''; ?>>Unavailable</option>
                            <option value="best_seller" <?php echo $stockFilter === 'best_seller' ? 'selected' : ''; ?>>Best Sellers</option>
                            <option value="low_stock" <?php echo $stockFilter === 'low_stock' ? 'selected' : ''; ?>>Low Stock</option>
                            <option value="out_of_stock" <?php echo $stockFilter === 'out_of_stock' ? 'selected' : ''; ?>>Out of Stock</option>
                            <option value="slow_moving" <?php echo $stockFilter === 'slow_moving' ? 'selected' : ''; ?>>Slow Moving</option>
                        </select>
                        <input type="text" name="search" value="<?php echo htmlspecialchars($searchTerm); ?>" placeholder="Search product..." class="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                        <button type="submit" class="bg-brand-black text-brand px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors">
                            <i class="fa-solid fa-filter"></i>
                        </button>
                        <a href="<?php echo analyticsUrl(['export' => 'csv']); ?>" class="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-bold hover:text-brand-black hover:border-brand-black transition-colors">
                            <i class="fa-solid fa-download"></i>
                        </a>
                    </form>
                </div>
            </header>

            <div class="flex-1 min-w-0 overflow-y-auto px-8 pb-8 pt-6">
                <!-- Summary Cards -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total Revenue</p>
                                <h3 class="font-serif text-3xl font-bold text-brand-black"><?php echo formatCurrency($totalRevenue); ?></h3>
                            </div>
                            <div class="w-10 h-10 rounded-full bg-brand-light text-brand-dark flex items-center justify-center text-lg"><i class="fa-solid fa-coins"></i></div>
                        </div>
                    </div>
                    <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Units Sold</p>
                                <h3 class="font-serif text-3xl font-bold text-brand-black"><?php echo $totalUnitsSold; ?></h3>
                            </div>
                            <div class="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-lg"><i class="fa-solid fa-box"></i></div>
                        </div>
                    </div>
                    <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Products Tracked</p>
                                <h3 class="font-serif text-3xl font-bold text-brand-black"><?php echo count($productAnalytics); ?></h3>
                            </div>
                            <div class="w-10 h-10 rounded-full bg-brand text-brand-black flex items-center justify-center text-lg"><i class="fa-solid fa-chart-pie"></i></div>
                        </div>
                    </div>
                </div>

                <!-- Highlights -->
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                    <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                        <p class="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Top Revenue</p>
                        <h3 class="font-serif text-xl font-bold text-brand-black leading-tight"><?php echo htmlspecialchars($topRevenueProduct['name'] ?? 'N/A'); ?></h3>
                        <p class="text-xs text-brand-dark font-bold mt-2"><?php echo formatCurrency($topRevenueProduct['total_revenue'] ?? 0); ?></p>
                    </div>
                    <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                        <p class="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Most Units Sold</p>
                        <h3 class="font-serif text-xl font-bold text-brand-black leading-tight"><?php echo htmlspecialchars($mostUnitsProduct['name'] ?? 'N/A'); ?></h3>
                        <p class="text-xs text-brand-dark font-bold mt-2"><?php echo (int)($mostUnitsProduct['total_sold'] ?? 0); ?> units</p>
                    </div>
                    <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                        <p class="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Slow Moving</p>
                        <h3 class="font-serif text-xl font-bold text-brand-black leading-tight"><?php echo htmlspecialchars($slowMovingProduct['name'] ?? 'None'); ?></h3>
                        <p class="text-xs text-gray-500 font-bold mt-2"><?php echo $slowMovingProduct ? (int)$slowMovingProduct['quantity'] . ' in stock, 0 sold' : 'No slow movers'; ?></p>
                    </div>
                    <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                        <p class="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Out of Stock Best Seller</p>
                        <h3 class="font-serif text-xl font-bold text-brand-black leading-tight"><?php echo htmlspecialchars($outOfStockBestSeller['name'] ?? 'None'); ?></h3>
                        <p class="text-xs <?php echo $outOfStockBestSeller ? 'text-red-600' : 'text-gray-500'; ?> font-bold mt-2"><?php echo $outOfStockBestSeller ? 'Needs restock' : 'No risk found'; ?></p>
                    </div>
                </div>

                <!-- Category Analytics Chart -->
                <div class="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-8">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="font-serif text-xl font-bold text-brand-black">Revenue by Category</h3>
                        <p class="text-xs text-gray-500">Click a bar label below to filter via table/category controls</p>
                    </div>
                    <div class="h-[300px]">
                        <canvas id="categoryChart"></canvas>
                    </div>
                    <div class="flex flex-wrap gap-2 mt-4">
                        <?php foreach ($categoryAnalytics as $category): ?>
                        <a href="<?php echo analyticsUrl(['category' => (int)$category['id']]); ?>" class="text-xs font-bold bg-gray-100 text-gray-600 hover:text-brand-black hover:bg-brand-light px-3 py-1.5 rounded-full">
                            <?php echo htmlspecialchars($category['name']); ?>
                        </a>
                        <?php endforeach; ?>
                    </div>
                </div>

                <!-- Product Performance Table -->
                <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-w-0">
                    <div class="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between gap-4">
                        <div>
                            <h3 class="font-serif text-xl font-bold text-brand-black">Product Performance</h3>
                            <p class="text-xs text-gray-500 mt-1 font-medium">Stock-aware breakdown with ABC revenue classes</p>
                        </div>
                        <select onchange="window.location.href=this.value" class="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand">
                            <option value="<?php echo analyticsUrl(['sort' => 'revenue_desc']); ?>" <?php echo $sort === 'revenue_desc' ? 'selected' : ''; ?>>Sort by Revenue</option>
                            <option value="<?php echo analyticsUrl(['sort' => 'units_desc']); ?>" <?php echo $sort === 'units_desc' ? 'selected' : ''; ?>>Sort by Units</option>
                            <option value="<?php echo analyticsUrl(['sort' => 'orders_desc']); ?>" <?php echo $sort === 'orders_desc' ? 'selected' : ''; ?>>Sort by Orders</option>
                            <option value="<?php echo analyticsUrl(['sort' => 'stock_asc']); ?>" <?php echo $sort === 'stock_asc' ? 'selected' : ''; ?>>Sort by Low Stock</option>
                            <option value="<?php echo analyticsUrl(['sort' => 'share_desc']); ?>" <?php echo $sort === 'share_desc' ? 'selected' : ''; ?>>Sort by Revenue Share</option>
                            <option value="<?php echo analyticsUrl(['sort' => 'name_asc']); ?>" <?php echo $sort === 'name_asc' ? 'selected' : ''; ?>>Sort by Name</option>
                        </select>
                    </div>
                    <div class="w-full overflow-x-auto">
                        <table class="w-full text-left border-collapse min-w-[1100px]">
                            <thead>
                                <tr class="bg-gray-50 border-b border-gray-200">
                                    <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Product</th>
                                    <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                                    <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Units Sold</th>
                                    <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Orders</th>
                                    <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Stock</th>
                                    <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Days Left</th>
                                    <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Sell Through</th>
                                    <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">ABC</th>
                                    <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Revenue</th>
                                    <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">% of Total</th>
                                    <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Vs Previous</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100">
                                <?php foreach ($productAnalytics as $product): ?>
                                <tr onclick="showProductDetails(<?php echo (int)$product['id']; ?>)" class="hover:bg-gray-50 transition-colors cursor-pointer">
                                    <td class="py-4 px-6 font-bold text-sm text-brand-black"><?php echo htmlspecialchars($product['name']); ?></td>
                                    <td class="py-4 px-6 text-sm text-gray-600"><?php echo htmlspecialchars($product['category_name']); ?></td>
                                    <td class="py-4 px-6 text-center font-bold text-gray-600"><?php echo (int)$product['total_sold']; ?></td>
                                    <td class="py-4 px-6 text-center text-sm text-gray-600"><?php echo (int)$product['order_count']; ?></td>
                                    <td class="py-4 px-6 text-center font-bold <?php echo (int)$product['quantity'] <= 0 ? 'text-red-600' : ((int)$product['quantity'] <= $lowStockThreshold ? 'text-yellow-700' : 'text-gray-600'); ?>"><?php echo (int)$product['quantity']; ?></td>
                                    <td class="py-4 px-6 text-center text-sm text-gray-600"><?php echo $product['days_of_stock_left'] === null ? 'No velocity' : $product['days_of_stock_left']; ?></td>
                                    <td class="py-4 px-6 text-center text-sm font-bold text-gray-600"><?php echo number_format($product['sell_through_rate'] * 100, 1); ?>%</td>
                                    <td class="py-4 px-6 text-center"><span class="text-xs font-bold px-2 py-1 rounded <?php echo $product['abc_class'] === 'A' ? 'bg-brand-light text-brand-dark' : ($product['abc_class'] === 'B' ? 'bg-gray-100 text-gray-700' : 'bg-red-50 text-red-600'); ?>"><?php echo $product['abc_class']; ?></span></td>
                                    <td class="py-4 px-6 text-right font-serif font-bold text-brand-black"><?php echo formatCurrency($product['total_revenue']); ?></td>
                                    <td class="py-4 px-6 text-right text-sm font-bold <?php echo $product['total_revenue'] > 0 ? 'text-green-600' : 'text-gray-400'; ?>">
                                        <?php echo number_format($product['revenue_share'], 1); ?>%
                                    </td>
                                    <td class="py-4 px-6 text-right text-sm font-bold <?php echo $product['revenue_change'] >= 0 ? 'text-green-600' : 'text-red-500'; ?>"><?php echo $product['revenue_change'] > 0 ? '+' : ''; ?><?php echo $product['revenue_change']; ?>%</td>
                                </tr>
                                <?php endforeach; ?>
                                <?php if (empty($productAnalytics)): ?>
                                <tr><td colspan="11" class="py-10 text-center text-gray-400 text-sm">No product analytics match the selected filters</td></tr>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>

    </div>

    <!-- Logout Confirmation Modal -->
    <div id="logoutModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 hidden">
        <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200">
            <div class="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
                <i class="fa-solid fa-arrow-right-from-bracket text-red-600 text-2xl"></i>
            </div>
            <h3 class="text-xl font-serif font-bold text-brand-black text-center mb-2">Confirm Logout</h3>
            <p class="text-gray-600 text-center mb-6">Are you sure you want to logout? You will need to sign in again to access the system.</p>
            <div class="flex gap-3">
                <button onclick="hideLogoutModal()" class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                    Cancel
                </button>
                <a href="logout.php" class="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors text-center">
                    Logout
                </a>
            </div>
        </div>
    </div>

    <!-- Product Details Modal -->
    <div id="productDetailsModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 hidden">
        <div class="bg-white rounded-2xl max-w-lg w-full mx-4 shadow-2xl border border-gray-200 max-h-[90vh] overflow-hidden flex flex-col">
            <div class="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
                <div>
                    <p id="productDetailsCategory" class="text-xs font-bold text-gray-500 uppercase tracking-wider">Category</p>
                    <h3 id="productDetailsName" class="text-2xl font-serif font-bold text-brand-black mt-1">Product</h3>
                    <p id="productDetailsDescription" class="text-sm text-gray-500 mt-1"></p>
                </div>
                <button type="button" onclick="hideProductDetails()" class="w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:text-brand-black hover:bg-gray-200 transition-colors shrink-0">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="p-6 overflow-y-auto">
                <div class="grid grid-cols-2 gap-3 mb-5">
                    <div class="bg-gray-50 border border-gray-200 rounded-xl p-3">
                        <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Revenue</p>
                        <p id="productDetailsRevenue" class="font-serif text-xl font-bold text-brand-black mt-1"></p>
                    </div>
                    <div class="bg-gray-50 border border-gray-200 rounded-xl p-3">
                        <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Units Sold</p>
                        <p id="productDetailsUnits" class="font-serif text-xl font-bold text-brand-black mt-1"></p>
                    </div>
                    <div class="bg-gray-50 border border-gray-200 rounded-xl p-3">
                        <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Current Stock</p>
                        <p id="productDetailsStock" class="font-serif text-xl font-bold text-brand-black mt-1"></p>
                    </div>
                    <div class="bg-gray-50 border border-gray-200 rounded-xl p-3">
                        <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">ABC Class</p>
                        <p id="productDetailsAbc" class="font-serif text-xl font-bold text-brand-black mt-1"></p>
                    </div>
                </div>
                <div class="space-y-3 text-sm">
                    <div class="flex justify-between border-b border-gray-100 pb-2"><span class="text-gray-600">Revenue Share</span><span id="productDetailsShare" class="font-bold"></span></div>
                    <div class="flex justify-between border-b border-gray-100 pb-2"><span class="text-gray-600">Sell Through</span><span id="productDetailsSellThrough" class="font-bold"></span></div>
                    <div class="flex justify-between border-b border-gray-100 pb-2"><span class="text-gray-600">Days of Stock Left</span><span id="productDetailsDays" class="font-bold"></span></div>
                    <div class="flex justify-between border-b border-gray-100 pb-2"><span class="text-gray-600">Revenue vs Previous</span><span id="productDetailsChange" class="font-bold"></span></div>
                    <div class="flex justify-between"><span class="text-gray-600">Profit / Margin</span><span class="font-bold text-gray-400">Cost data not configured</span></div>
                </div>
            </div>
            <div class="p-6 border-t border-gray-100 bg-gray-50">
                <button type="button" onclick="hideProductDetails()" class="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">Close</button>
            </div>
        </div>
    </div>

    <script>
        const productData = <?php echo json_encode(array_map(function ($product) {
            return [
                'id' => (int)$product['id'],
                'name' => $product['name'],
                'description' => $product['description'],
                'category_name' => $product['category_name'],
                'total_sold' => (int)$product['total_sold'],
                'total_revenue' => (float)$product['total_revenue'],
                'quantity' => (int)$product['quantity'],
                'abc_class' => $product['abc_class'],
                'revenue_share' => (float)$product['revenue_share'],
                'sell_through_rate' => (float)$product['sell_through_rate'],
                'days_of_stock_left' => $product['days_of_stock_left'],
                'revenue_change' => (float)$product['revenue_change'],
            ];
        }, $productAnalytics)); ?>;

        function formatPeso(amount) {
            return new Intl.NumberFormat('en-PH', {
                style: 'currency',
                currency: 'PHP',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(Number(amount) || 0);
        }

        function hideProductDetails() {
            document.getElementById('productDetailsModal').classList.add('hidden');
        }

        function showProductDetails(productId) {
            const product = productData.find(item => item.id === Number(productId));
            if (!product) return;
            document.getElementById('productDetailsCategory').textContent = product.category_name || 'Uncategorized';
            document.getElementById('productDetailsName').textContent = product.name;
            document.getElementById('productDetailsDescription').textContent = product.description || 'No description';
            document.getElementById('productDetailsRevenue').textContent = formatPeso(product.total_revenue);
            document.getElementById('productDetailsUnits').textContent = product.total_sold;
            document.getElementById('productDetailsStock').textContent = product.quantity;
            document.getElementById('productDetailsAbc').textContent = product.abc_class;
            document.getElementById('productDetailsShare').textContent = product.revenue_share.toFixed(1) + '%';
            document.getElementById('productDetailsSellThrough').textContent = (product.sell_through_rate * 100).toFixed(1) + '%';
            document.getElementById('productDetailsDays').textContent = product.days_of_stock_left === null ? 'No sales velocity' : product.days_of_stock_left;
            const change = document.getElementById('productDetailsChange');
            change.textContent = (product.revenue_change > 0 ? '+' : '') + product.revenue_change + '%';
            change.className = 'font-bold ' + (product.revenue_change >= 0 ? 'text-green-600' : 'text-red-500');
            document.getElementById('productDetailsModal').classList.remove('hidden');
        }

        // Category Chart
        const categoryCtx = document.getElementById('categoryChart').getContext('2d');
        new Chart(categoryCtx, {
            type: 'bar',
            data: {
                labels: <?php echo json_encode(array_column($categoryAnalytics, 'name')); ?>,
                datasets: [{
                    label: 'Revenue',
                    data: <?php echo json_encode(array_column($categoryAnalytics, 'total_revenue')); ?>,
                    backgroundColor: ['#FBBF24', '#D97706', '#171717', '#D1D5DB', '#9CA3AF'],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₱' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });

        function showLogoutModal() {
            document.getElementById('logoutModal').classList.remove('hidden');
        }
        
        function hideLogoutModal() {
            document.getElementById('logoutModal').classList.add('hidden');
        }

        // Sidebar toggle functionality
        const sidebar = document.getElementById('sidebar');
        const sidebarToggle = document.getElementById('sidebarToggle');
        const navTexts = document.querySelectorAll('.nav-text');
        let isCollapsed = localStorage.getItem('sidebarCollapsed') !== 'false';

        // Apply collapsed state by default
        sidebarToggle.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
        navTexts.forEach(text => {
            text.classList.add('hidden');
        });
        const navItems = document.querySelectorAll('#navigation a');
        navItems.forEach(item => {
            item.classList.add('justify-center');
            item.classList.remove('gap-4');
        });
        const logoText = sidebar.querySelector('h1');
        const logoSubtext = sidebar.querySelector('span.text-gray-500');
        const logoDivider = sidebar.querySelectorAll('.h-px');
        const logoSince = sidebar.querySelector('span.text-gray-400');
        if (logoText) logoText.classList.add('hidden');
        if (logoSubtext) logoSubtext.classList.add('hidden');
        if (logoSince) logoSince.classList.add('hidden');
        logoDivider.forEach(div => div.classList.add('hidden'));
        const userName = sidebar.querySelector('.text-sm.font-medium');
        if (userName) userName.classList.add('hidden');

        if (!isCollapsed) {
            sidebar.classList.remove('w-[80px]');
            sidebar.classList.add('w-[240px]');
            sidebarToggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
            navTexts.forEach(text => text.classList.remove('hidden'));
            navItems.forEach(item => {
                item.classList.remove('justify-center');
                item.classList.add('gap-4');
            });
            if (logoText) logoText.classList.remove('hidden');
            if (logoSubtext) logoSubtext.classList.remove('hidden');
            if (logoSince) logoSince.classList.remove('hidden');
            logoDivider.forEach(div => div.classList.remove('hidden'));
            if (userName) userName.classList.remove('hidden');
        }

        sidebarToggle.addEventListener('click', () => {
            isCollapsed = !isCollapsed;
            localStorage.setItem('sidebarCollapsed', String(isCollapsed));
            
            if (isCollapsed) {
                sidebar.classList.remove('w-[240px]');
                sidebar.classList.add('w-[80px]');
                sidebarToggle.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
                
                navTexts.forEach(text => {
                    text.classList.add('hidden');
                });
                
                const navItems = document.querySelectorAll('#navigation a');
                navItems.forEach(item => {
                    item.classList.add('justify-center');
                    item.classList.remove('gap-4');
                });
                
                const logoText = sidebar.querySelector('h1');
                const logoSubtext = sidebar.querySelector('span.text-gray-500');
                const logoDivider = sidebar.querySelectorAll('.h-px');
                const logoSince = sidebar.querySelector('span.text-gray-400');
                
                if (logoText) logoText.classList.add('hidden');
                if (logoSubtext) logoSubtext.classList.add('hidden');
                if (logoSince) logoSince.classList.add('hidden');
                logoDivider.forEach(div => div.classList.add('hidden'));
                
                const userName = sidebar.querySelector('.text-sm.font-medium');
                if (userName) userName.classList.add('hidden');
                
            } else {
                sidebar.classList.remove('w-[80px]');
                sidebar.classList.add('w-[240px]');
                sidebarToggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
                
                navTexts.forEach(text => {
                    text.classList.remove('hidden');
                });
                
                const navItems = document.querySelectorAll('#navigation a');
                navItems.forEach(item => {
                    item.classList.remove('justify-center');
                    item.classList.add('gap-4');
                });
                
                const logoText = sidebar.querySelector('h1');
                const logoSubtext = sidebar.querySelector('span.text-gray-500');
                const logoDivider = sidebar.querySelectorAll('.h-px');
                const logoSince = sidebar.querySelector('span.text-gray-400');
                
                if (logoText) logoText.classList.remove('hidden');
                if (logoSubtext) logoSubtext.classList.remove('hidden');
                if (logoSince) logoSince.classList.remove('hidden');
                logoDivider.forEach(div => div.classList.remove('hidden'));
                
                const userName = sidebar.querySelector('.text-sm.font-medium');
                if (userName) userName.classList.remove('hidden');
            }
        });
    </script>
    <?php include __DIR__ . '/staff_chatbot.php'; ?>
</body>
</html>
