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

function percentChange($current, $previous) {
    $current = (float)$current;
    $previous = (float)$previous;
    if ($previous == 0) {
        return $current > 0 ? 100 : 0;
    }
    return round((($current - $previous) / $previous) * 100, 1);
}

function changeClass($value) {
    return $value >= 0 ? 'text-green-600' : 'text-red-500';
}

function changeIcon($value) {
    return $value >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
}

function salesUrl(array $overrides = []) {
    $params = array_merge($_GET, $overrides);
    foreach ($params as $key => $value) {
        if ($value === '' || $value === null || ($key === 'date_filter' && $value === 'today') || ($key === 'chart_view' && $value === 'auto')) {
            unset($params[$key]);
        }
    }
    return 'sales.php' . (empty($params) ? '' : '?' . http_build_query($params));
}

function reportDateInput($value, $fallback) {
    if (!is_string($value) || !preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $parts) || !checkdate((int)$parts[2], (int)$parts[3], (int)$parts[1])) {
        return $fallback;
    }
    return $value;
}

// Get date filter
$dateFilter = $_GET['date_filter'] ?? 'today';
$chartView = $_GET['chart_view'] ?? 'auto';
$transactionSearch = sanitize($_GET['search'] ?? '');
$paymentFilter = $_GET['payment_method'] ?? '';
$orderTypeFilter = $_GET['order_type'] ?? '';
$cashierFilter = isset($_GET['cashier_id']) ? (int)$_GET['cashier_id'] : 0;
$startDate = null;
$endDate = null;

switch ($dateFilter) {
    case 'custom':
        $customStart = $_GET['start_date'] ?? date('Y-m-d');
        $customEnd = $_GET['end_date'] ?? date('Y-m-d');
        $startDate = date('Y-m-d 00:00:00', strtotime($customStart));
        $endDate = date('Y-m-d 23:59:59', strtotime($customEnd));
        if ($startDate > $endDate) {
            [$startDate, $endDate] = [$endDate, $startDate];
        }
        break;
    case 'today':
        $startDate = date('Y-m-d 00:00:00');
        $endDate = date('Y-m-d 23:59:59');
        break;
    case 'yesterday':
        $startDate = date('Y-m-d 00:00:00', strtotime('yesterday'));
        $endDate = date('Y-m-d 23:59:59', strtotime('yesterday'));
        break;
    case 'this_week':
        $startDate = date('Y-m-d 00:00:00', strtotime('monday this week'));
        $endDate = date('Y-m-d 23:59:59', strtotime('sunday this week'));
        break;
    case 'this_month':
        $startDate = date('Y-m-01 00:00:00');
        $endDate = date('Y-m-t 23:59:59');
        break;
    default:
        $dateFilter = 'today';
        $startDate = date('Y-m-d 00:00:00');
        $endDate = date('Y-m-d 23:59:59');
}
$periodSeconds = max(1, strtotime($endDate) - strtotime($startDate) + 1);
$previousStartDate = date('Y-m-d H:i:s', strtotime($startDate) - $periodSeconds);
$previousEndDate = date('Y-m-d H:i:s', strtotime($startDate) - 1);

// The detailed ledger can use its own calendar range without changing the
// summary cards and charts above it.
$transactionStartInput = reportDateInput($_GET['transaction_start_date'] ?? null, date('Y-m-d', strtotime($startDate)));
$transactionEndInput = reportDateInput($_GET['transaction_end_date'] ?? null, date('Y-m-d', strtotime($endDate)));
$transactionStartDate = date('Y-m-d 00:00:00', strtotime($transactionStartInput));
$transactionEndDate = date('Y-m-d 23:59:59', strtotime($transactionEndInput));
if ($transactionStartDate > $transactionEndDate) {
    [$transactionStartDate, $transactionEndDate] = [$transactionEndDate, $transactionStartDate];
    [$transactionStartInput, $transactionEndInput] = [$transactionEndInput, $transactionStartInput];
}

if (isset($_GET['export']) && $_GET['export'] === 'csv') {
    $stmt = $pdo->prepare("SELECT o.order_number, o.created_at, o.order_type, COALESCE(t.table_number, '') as table_number, o.payment_method, u.full_name as cashier_name, o.subtotal, o.discount_amount, o.tax_amount, o.total_amount,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
        FROM orders o
        LEFT JOIN tables t ON o.table_id = t.id
        LEFT JOIN users u ON o.cashier_id = u.id
        WHERE o.status = 'completed' AND o.created_at BETWEEN ? AND ?
        ORDER BY o.created_at DESC");
    $stmt->execute([$startDate, $endDate]);
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="sales-report-' . date('Ymd-His') . '.csv"');
    $output = fopen('php://output', 'w');
    fputcsv($output, ['Order Number', 'Date Time', 'Order Type', 'Table', 'Payment', 'Cashier', 'Items', 'Subtotal', 'Discount', 'Tax', 'Total']);
    foreach ($stmt->fetchAll() as $row) {
        fputcsv($output, $row);
    }
    fclose($output);
    exit;
}

// Get sales summary
$stmt = $pdo->prepare("SELECT 
    COUNT(*) as total_orders,
    SUM(total_amount) as total_sales,
    AVG(total_amount) as avg_order_value,
    SUM(discount_amount) as total_discounts,
    SUM(CASE WHEN discount_amount > 0 THEN 1 ELSE 0 END) as discounted_orders
    FROM orders 
    WHERE status = 'completed' 
    AND created_at BETWEEN ? AND ?");
$stmt->execute([$startDate, $endDate]);
$salesSummary = $stmt->fetch();

$stmt = $pdo->prepare("SELECT COUNT(*) as total_orders, SUM(total_amount) as total_sales, AVG(total_amount) as avg_order_value
    FROM orders WHERE status = 'completed' AND created_at BETWEEN ? AND ?");
$stmt->execute([$previousStartDate, $previousEndDate]);
$previousSummary = $stmt->fetch();
$salesChange = percentChange($salesSummary['total_sales'] ?? 0, $previousSummary['total_sales'] ?? 0);
$ordersChange = percentChange($salesSummary['total_orders'] ?? 0, $previousSummary['total_orders'] ?? 0);
$avgOrderChange = percentChange($salesSummary['avg_order_value'] ?? 0, $previousSummary['avg_order_value'] ?? 0);

// Get best selling item
$stmt = $pdo->prepare("SELECT 
    mi.name, 
    SUM(oi.quantity) as total_quantity,
    SUM(oi.total_price) as total_revenue
    FROM order_items oi
    JOIN menu_items mi ON oi.menu_item_id = mi.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status = 'completed' 
    AND o.created_at BETWEEN ? AND ?
    GROUP BY mi.id, mi.name
    ORDER BY total_quantity DESC
    LIMIT 1");
$stmt->execute([$startDate, $endDate]);
$bestSellingItem = $stmt->fetch();

// Get sales trend
$salesTrend = [];
$salesTrendLabels = [];
$effectiveChartView = $chartView === 'auto' ? ($dateFilter === 'today' ? 'hourly' : 'daily') : $chartView;
if ($effectiveChartView === 'hourly') {
    $baseDate = date('Y-m-d', strtotime($startDate));
    for ($i = 0; $i < 24; $i++) {
        $hourStart = $baseDate . ' ' . sprintf('%02d', $i) . ':00:00';
        $hourEnd = $baseDate . ' ' . sprintf('%02d', $i) . ':59:59';
        
        $stmt = $pdo->prepare("SELECT SUM(total_amount) as sales FROM orders WHERE status = 'completed' AND created_at BETWEEN ? AND ?");
        $stmt->execute([$hourStart, $hourEnd]);
        $result = $stmt->fetch();
        $salesTrend[] = $result['sales'] ?? 0;
        $salesTrendLabels[] = sprintf('%02d:00', $i);
    }
} elseif ($effectiveChartView === 'monthly') {
    for ($i = 11; $i >= 0; $i--) {
        $monthStart = date('Y-m-01 00:00:00', strtotime("-$i months"));
        $monthEnd = date('Y-m-t 23:59:59', strtotime("-$i months"));
        $stmt = $pdo->prepare("SELECT SUM(total_amount) as sales FROM orders WHERE status = 'completed' AND created_at BETWEEN ? AND ?");
        $stmt->execute([$monthStart, $monthEnd]);
        $result = $stmt->fetch();
        $salesTrend[] = $result['sales'] ?? 0;
        $salesTrendLabels[] = date('M Y', strtotime($monthStart));
    }
} else {
    $days = max(1, min(31, (int)ceil($periodSeconds / 86400)));
    for ($i = $days - 1; $i >= 0; $i--) {
        $dayStart = date('Y-m-d 00:00:00', strtotime($endDate . " -$i days"));
        $dayEnd = date('Y-m-d 23:59:59', strtotime($endDate . " -$i days"));
        
        $stmt = $pdo->prepare("SELECT SUM(total_amount) as sales FROM orders WHERE status = 'completed' AND created_at BETWEEN ? AND ?");
        $stmt->execute([$dayStart, $dayEnd]);
        $result = $stmt->fetch();
        $salesTrend[] = $result['sales'] ?? 0;
        $salesTrendLabels[] = date('M d', strtotime($dayStart));
    }
}
$peakIndex = empty($salesTrend) ? null : array_keys($salesTrend, max($salesTrend))[0];
$slowIndex = empty($salesTrend) ? null : array_keys($salesTrend, min($salesTrend))[0];

// Get order type breakdown
$stmt = $pdo->prepare("SELECT 
    order_type,
    COUNT(*) as order_count,
    SUM(total_amount) as total_amount
    FROM orders 
    WHERE status = 'completed' 
    AND created_at BETWEEN ? AND ?
    GROUP BY order_type");
$stmt->execute([$startDate, $endDate]);
$orderTypeBreakdown = $stmt->fetchAll();

// Calculate order type percentages
$totalOrderAmount = array_sum(array_column($orderTypeBreakdown, 'total_amount'));
foreach ($orderTypeBreakdown as &$type) {
    $type['percentage'] = $totalOrderAmount > 0 ? round(($type['total_amount'] / $totalOrderAmount) * 100, 0) : 0;
}

// Get payment method breakdown
$stmt = $pdo->prepare("SELECT 
    payment_method,
    COUNT(*) as transaction_count,
    SUM(total_amount) as total_amount
    FROM orders 
    WHERE status = 'completed' 
    AND created_at BETWEEN ? AND ?
    GROUP BY payment_method");
$stmt->execute([$startDate, $endDate]);
$paymentBreakdown = $stmt->fetchAll();

// Get cashier breakdown
$stmt = $pdo->prepare("SELECT u.id, u.full_name, COUNT(*) as order_count, SUM(o.total_amount) as total_sales, AVG(o.total_amount) as avg_order_value
    FROM orders o
    JOIN users u ON o.cashier_id = u.id
    WHERE o.status = 'completed' AND o.created_at BETWEEN ? AND ?
    GROUP BY u.id, u.full_name
    ORDER BY total_sales DESC");
$stmt->execute([$startDate, $endDate]);
$cashierBreakdown = $stmt->fetchAll();

$stmt = $pdo->query("SELECT id, full_name FROM users ORDER BY full_name ASC");
$cashiers = $stmt->fetchAll();

// Get category sales
$stmt = $pdo->prepare("SELECT 
    c.name as category_name,
    SUM(oi.total_price) as total_sales
    FROM order_items oi
    JOIN menu_items mi ON oi.menu_item_id = mi.id
    JOIN categories c ON mi.category_id = c.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status = 'completed' 
    AND o.created_at BETWEEN ? AND ?
    GROUP BY c.id, c.name
    ORDER BY total_sales DESC");
$stmt->execute([$startDate, $endDate]);
$categorySales = $stmt->fetchAll();

// Get top products
$stmt = $pdo->prepare("SELECT 
    mi.name,
    SUM(oi.quantity) as total_quantity,
    SUM(oi.total_price) as total_revenue
    FROM order_items oi
    JOIN menu_items mi ON oi.menu_item_id = mi.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status = 'completed' 
    AND o.created_at BETWEEN ? AND ?
    GROUP BY mi.id, mi.name
    ORDER BY total_quantity DESC
    LIMIT 10");
$stmt->execute([$startDate, $endDate]);
$topProducts = $stmt->fetchAll();

// Get detailed transactions
$transactionWhere = ["o.status = 'completed'", "o.created_at BETWEEN ? AND ?"];
$transactionParams = [$transactionStartDate, $transactionEndDate];
if ($transactionSearch !== '') {
    $transactionWhere[] = "(o.order_number LIKE ? OR u.full_name LIKE ? OR o.customer_name LIKE ?)";
    $like = '%' . $transactionSearch . '%';
    array_push($transactionParams, $like, $like, $like);
}
if (in_array($paymentFilter, ['cash', 'card', 'gcash'], true)) {
    $transactionWhere[] = "o.payment_method = ?";
    $transactionParams[] = $paymentFilter;
}
if (in_array($orderTypeFilter, ['dine_in', 'take_away', 'delivery'], true)) {
    $transactionWhere[] = "o.order_type = ?";
    $transactionParams[] = $orderTypeFilter;
}
if ($cashierFilter > 0) {
    $transactionWhere[] = "o.cashier_id = ?";
    $transactionParams[] = $cashierFilter;
}
$transactionWhereSql = implode(' AND ', $transactionWhere);
$stmt = $pdo->prepare("SELECT 
    o.id,
    o.order_number,
    o.created_at,
    o.order_type,
    t.table_number,
    o.payment_method,
    u.full_name as cashier_name,
    o.discount_amount,
    o.total_amount,
    (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
    FROM orders o
    LEFT JOIN tables t ON o.table_id = t.id
    LEFT JOIN users u ON o.cashier_id = u.id
    WHERE {$transactionWhereSql}
    ORDER BY o.created_at DESC
    LIMIT 50");
$stmt->execute($transactionParams);
$transactions = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yellow Hauz POS - Sales Report</title>
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
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        @media (prefers-reduced-motion: no-preference) {
            [id$="Modal"] { animation: yh-modal-backdrop .2s ease }
            [id$="Modal"] > div { animation: yh-modal-panel .25s cubic-bezier(.16,1,.3,1) }
            @keyframes yh-modal-backdrop { from { opacity: 0 } to { opacity: 1 } }
            @keyframes yh-modal-panel { from { opacity: 0; transform: scale(.95) translateY(10px) } to { opacity: 1; transform: scale(1) translateY(0) } }
            button:not(:disabled) { transition: transform .15s ease }
            button:active:not(:disabled) { transform: scale(.97) }
        }
    </style>
</head>
<body class="bg-[#EAE8E3] h-screen w-screen p-3 font-sans text-brand-black overflow-hidden">

    <div class="bg-vintage-paper w-full h-full rounded-2xl shadow-2xl flex overflow-hidden border border-gray-300 relative">
        
        <!-- LEFT SIDEBAR -->
        <aside id="sidebar" class="w-[80px] bg-white border-r border-vintage-border flex flex-col justify-between py-6 px-4 shrink-0 z-20 relative transition-all duration-300 ease-in-out">
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
                <nav id="navigation" class="space-y-1.5">
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
                    
                    <a href="sales.php" class="flex items-center gap-4 bg-brand-black text-brand px-4 py-3.5 rounded-2xl font-semibold shadow-md transition-all">
                        <i class="fa-solid fa-chart-line w-5 text-center"></i> <span class="nav-text">Sales Report</span>
                    </a>
                    
                    <a href="analysis.php" class="flex items-center gap-4 text-gray-500 hover:text-brand-black hover:bg-gray-100 px-4 py-3.5 rounded-2xl font-medium transition-all">
                        <i class="fa-solid fa-chart-pie w-5 text-center"></i> <span class="nav-text">Product Analytics</span>
                    </a>

                    <a href="settings.php" class="flex items-center gap-4 text-gray-500 hover:text-brand-black hover:bg-gray-100 px-4 py-3.5 rounded-2xl font-medium transition-all">
                        <i class="fa-solid fa-gear w-5 text-center"></i> <span class="nav-text">Settings</span>
                    </a>
                </nav>
            </div>

            <!-- Bottom Logout -->
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

        <!-- MAIN CONTENT -->
        <main class="flex-1 flex flex-col relative bg-vintage-paper overflow-hidden">
            
            <!-- Top Header & Filters -->
            <header class="h-[88px] flex items-center justify-between px-8 shrink-0 border-b border-gray-200/80 bg-white/60 backdrop-blur-md z-20">
                <div class="flex items-center gap-4">
                    <button id="sidebarToggle" class="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-500 hover:text-brand-black mr-4">
                        <i class="fa-solid fa-bars"></i>
                    </button>
                    <h2 class="text-2xl font-serif font-bold text-brand-black tracking-wide">SALES REPORT</h2>
                </div>
                
                <!-- Date Filters -->
                <div class="flex items-center gap-3">
                    <div class="flex items-center bg-white border border-gray-200 rounded-lg p-1 shadow-sm text-sm">
                        <a href="?date_filter=today" class="px-3 py-1.5 rounded-md <?php echo $dateFilter === 'today' ? 'bg-brand-light text-brand-dark font-bold border border-brand/20 shadow-sm' : 'text-gray-500 hover:text-brand-black font-semibold'; ?> transition-all">Today</a>
                        <a href="?date_filter=yesterday" class="px-3 py-1.5 rounded-md <?php echo $dateFilter === 'yesterday' ? 'bg-brand-light text-brand-dark font-bold border border-brand/20 shadow-sm' : 'text-gray-500 hover:text-brand-black font-semibold'; ?> transition-all">Yesterday</a>
                        <a href="?date_filter=this_week" class="px-3 py-1.5 rounded-md <?php echo $dateFilter === 'this_week' ? 'bg-brand-light text-brand-dark font-bold border border-brand/20 shadow-sm' : 'text-gray-500 hover:text-brand-black font-semibold'; ?> transition-all">This Week</a>
                        <a href="?date_filter=this_month" class="px-3 py-1.5 rounded-md <?php echo $dateFilter === 'this_month' ? 'bg-brand-light text-brand-dark font-bold border border-brand/20 shadow-sm' : 'text-gray-500 hover:text-brand-black font-semibold'; ?> transition-all">This Month</a>
                        <div class="w-px h-4 bg-gray-300 mx-1"></div>
                        <button onclick="showCustomDateModal()" class="px-3 py-1.5 rounded-md <?php echo $dateFilter === 'custom' ? 'bg-brand-light text-brand-dark font-bold border border-brand/20 shadow-sm' : 'text-gray-500 hover:text-brand-black font-semibold'; ?> flex items-center gap-2 transition-all">
                            <i class="fa-regular fa-calendar"></i> Custom
                        </button>
                    </div>
                    
                    <a href="<?php echo salesUrl(['export' => 'csv']); ?>" class="bg-brand-black text-brand w-10 h-10 rounded-lg flex items-center justify-center font-bold shadow-[2px_2px_0px_0px_rgba(251,191,36,1)] hover:bg-gray-800 transition-all active:translate-y-0.5 active:translate-x-0.5 active:shadow-none border border-transparent">
                        <i class="fa-solid fa-download"></i>
                    </a>
                </div>
            </header>

            <!-- Workspace: Scrollable Dashboard Content -->
            <div class="flex-1 overflow-y-auto p-8 hide-scrollbar">
                
                <!-- 1. Sales Summary (KPI Cards) -->
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                    
                    <!-- Card 1 -->
                    <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-start justify-between group hover:border-brand-black transition-colors">
                        <div>
                            <p class="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total Sales</p>
                            <h3 class="font-serif text-3xl font-bold text-brand-black"><?php echo formatCurrency($salesSummary['total_sales'] ?? 0); ?></h3>
                            <p class="text-[11px] font-bold mt-2 <?php echo changeClass($salesChange); ?> flex items-center gap-1"><i class="fa-solid <?php echo changeIcon($salesChange); ?>"></i> <?php echo $salesChange > 0 ? '+' : ''; ?><?php echo $salesChange; ?>% vs Previous</p>
                        </div>
                        <div class="w-10 h-10 rounded-full bg-brand-light text-brand-dark flex items-center justify-center text-lg shadow-inner"><i class="fa-solid fa-coins"></i></div>
                    </div>

                    <!-- Card 2 -->
                    <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-start justify-between group hover:border-brand-black transition-colors">
                        <div>
                            <p class="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total Orders</p>
                            <h3 class="font-serif text-3xl font-bold text-brand-black"><?php echo $salesSummary['total_orders'] ?? 0; ?></h3>
                            <p class="text-[11px] font-bold mt-2 <?php echo changeClass($ordersChange); ?> flex items-center gap-1"><i class="fa-solid <?php echo changeIcon($ordersChange); ?>"></i> <?php echo $ordersChange > 0 ? '+' : ''; ?><?php echo $ordersChange; ?>% vs Previous</p>
                        </div>
                        <div class="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-lg shadow-inner"><i class="fa-solid fa-receipt"></i></div>
                    </div>

                    <!-- Card 3 -->
                    <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-start justify-between group hover:border-brand-black transition-colors">
                        <div>
                            <p class="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Avg Order Value</p>
                            <h3 class="font-serif text-3xl font-bold text-brand-black"><?php echo formatCurrency($salesSummary['avg_order_value'] ?? 0); ?></h3>
                            <p class="text-[11px] font-bold mt-2 <?php echo changeClass($avgOrderChange); ?> flex items-center gap-1"><i class="fa-solid <?php echo changeIcon($avgOrderChange); ?>"></i> <?php echo $avgOrderChange > 0 ? '+' : ''; ?><?php echo $avgOrderChange; ?>% vs Previous</p>
                        </div>
                        <div class="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-lg shadow-inner"><i class="fa-solid fa-chart-pie"></i></div>
                    </div>

                    <!-- Card 4 -->
                    <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-start justify-between group hover:border-brand-black transition-colors">
                        <div>
                            <p class="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Best-Selling Item</p>
                            <h3 class="font-serif text-xl font-bold text-brand-black leading-tight mt-1"><?php echo htmlspecialchars($bestSellingItem['name'] ?? 'N/A'); ?></h3>
                            <p class="text-[11px] font-bold mt-2 text-brand-dark"><?php echo $bestSellingItem['total_quantity'] ?? 0; ?> Units Sold</p>
                        </div>
                        <div class="w-10 h-10 rounded-full bg-brand text-brand-black flex items-center justify-center text-lg shadow-inner border border-brand-black/20"><i class="fa-solid fa-mug-hot"></i></div>
                    </div>
                </div>

                <!-- 2. Sales Trend Chart -->
                <div class="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col mb-8">
                    <div class="flex justify-between items-center mb-6">
                        <div>
                            <h3 class="font-serif text-xl font-bold text-brand-black">Sales Trend</h3>
                            <p class="text-xs text-gray-500 font-medium mt-1">Gross sales over the selected period</p>
                        </div>
                        <div class="flex items-center bg-gray-50 border border-gray-200 rounded-md p-1">
                            <a href="<?php echo salesUrl(['chart_view' => 'hourly']); ?>" class="px-3 py-1 rounded <?php echo $effectiveChartView === 'hourly' ? 'bg-white text-brand-black font-bold shadow-sm' : 'text-gray-500 hover:text-brand-black font-semibold'; ?> text-xs transition-all">Hourly</a>
                            <a href="<?php echo salesUrl(['chart_view' => 'daily']); ?>" class="px-3 py-1 rounded <?php echo $effectiveChartView === 'daily' ? 'bg-white text-brand-black font-bold shadow-sm' : 'text-gray-500 hover:text-brand-black font-semibold'; ?> text-xs transition-all">Daily</a>
                            <a href="<?php echo salesUrl(['chart_view' => 'monthly']); ?>" class="px-3 py-1 rounded <?php echo $effectiveChartView === 'monthly' ? 'bg-white text-brand-black font-bold shadow-sm' : 'text-gray-500 hover:text-brand-black font-semibold'; ?> text-xs transition-all">Monthly</a>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        <div class="bg-gray-50 border border-gray-200 rounded-xl p-3">
                            <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Peak Period</p>
                            <p class="text-sm font-bold text-brand-black mt-1"><?php echo $peakIndex !== null ? htmlspecialchars($salesTrendLabels[$peakIndex]) . ' · ' . formatCurrency($salesTrend[$peakIndex]) : 'No data'; ?></p>
                        </div>
                        <div class="bg-gray-50 border border-gray-200 rounded-xl p-3">
                            <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Slowest Period</p>
                            <p class="text-sm font-bold text-brand-black mt-1"><?php echo $slowIndex !== null ? htmlspecialchars($salesTrendLabels[$slowIndex]) . ' · ' . formatCurrency($salesTrend[$slowIndex]) : 'No data'; ?></p>
                        </div>
                    </div>
                    <div class="w-full flex-1 min-h-[250px] relative">
                        <canvas id="salesTrendChart"></canvas>
                    </div>
                </div>

                <!-- 3. Order Type Breakdown & Category Sales -->
                <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                    
                    <!-- Order Type Breakdown -->
                    <div class="bg-brand-black text-white p-6 rounded-2xl border-2 border-brand/20 shadow-lg relative overflow-hidden flex flex-col justify-between">
                        <div class="absolute right-0 top-0 w-32 h-32 bg-brand rounded-bl-full -z-0 opacity-10"></div>
                        
                        <div class="relative z-10 mb-6">
                            <h3 class="font-serif text-xl font-bold text-brand">Order Types</h3>
                            <p class="text-xs text-gray-400 font-medium mt-1">Distribution of service methods</p>
                        </div>

                        <div class="relative z-10 space-y-5">
                            <?php foreach ($orderTypeBreakdown as $type): ?>
                            <div>
                                <div class="flex justify-between items-end mb-1.5">
                                    <span class="text-sm font-bold flex items-center gap-2">
                                        <?php 
                                        $icon = 'fa-solid fa-utensils';
                                        if ($type['order_type'] === 'take_away') $icon = 'fa-solid fa-bag-shopping';
                                        elseif ($type['order_type'] === 'delivery') $icon = 'fa-solid fa-motorcycle';
                                        ?>
                                        <i class="<?php echo $icon; ?> text-brand w-4"></i> 
                                        <?php echo ucfirst(str_replace('_', ' ', $type['order_type'])); ?>
                                    </span>
                                    <div class="text-right">
                                        <span class="text-sm font-bold block"><?php echo formatCurrency($type['total_amount']); ?></span>
                                        <span class="text-[10px] text-gray-400 font-medium"><?php echo $type['percentage']; ?>%</span>
                                    </div>
                                </div>
                                <div class="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div class="h-full bg-brand rounded-full" style="width: <?php echo $type['percentage']; ?>%; box-shadow: 0 0 10px rgba(251,191,36,0.5);"></div>
                                </div>
                            </div>
                            <?php endforeach; ?>
                        </div>
                    </div>

                    <!-- Category Sales Chart -->
                    <div class="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center">
                        <div class="w-full flex justify-between items-center mb-4">
                            <h3 class="font-serif text-lg font-bold text-brand-black">Category Sales</h3>
                            <button class="text-gray-400 hover:text-brand-black"><i class="fa-solid fa-ellipsis"></i></button>
                        </div>
                        <div class="w-full h-[180px] relative mb-4">
                            <canvas id="categorySalesChart"></canvas>
                        </div>
                        <!-- Custom Legend -->
                        <div class="w-full grid grid-cols-2 gap-2 mt-auto">
                            <?php 
                            $colors = ['#171717', '#FBBF24', '#D97706', '#D1D5DB'];
                            $colorIndex = 0;
                            foreach ($categorySales as $cat): 
                                if ($colorIndex >= 4) break;
                            ?>
                            <div class="flex items-center gap-2 text-xs font-bold text-gray-600">
                                <span class="w-3 h-3 rounded-full" style="background-color: <?php echo $colors[$colorIndex]; ?>;"></span> 
                                <?php echo htmlspecialchars($cat['category_name']); ?>
                            </div>
                            <?php 
                            $colorIndex++;
                            endforeach; 
                            ?>
                        </div>
                    </div>

                </div>

                <!-- 4. Payment Methods & Top Products -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    
                    <!-- Payment Method Breakdown -->
                    <div class="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
                        <div class="flex justify-between items-center mb-6">
                            <h3 class="font-serif text-lg font-bold text-brand-black">Payment Methods</h3>
                            <button class="text-gray-400 hover:text-brand-black"><i class="fa-solid fa-ellipsis"></i></button>
                        </div>
                        <div class="flex-1 space-y-4">
                            <?php foreach ($paymentBreakdown as $method): ?>
                            <div class="flex items-center justify-between p-3 border border-gray-100 bg-gray-50 rounded-xl">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-lg bg-white shadow-sm border border-gray-200 text-brand-black flex items-center justify-center">
                                        <?php 
                                        $icon = 'fa-solid fa-money-bill-wave';
                                        if ($method['payment_method'] === 'card') $icon = 'fa-regular fa-credit-card';
                                        elseif ($method['payment_method'] === 'gcash') $icon = 'fa-solid fa-mobile-screen text-blue-500';
                                        ?>
                                        <i class="<?php echo $icon; ?>"></i>
                                    </div>
                                    <div>
                                        <h4 class="font-bold text-sm text-brand-black"><?php echo ucfirst($method['payment_method']); ?></h4>
                                        <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider"><?php echo $method['transaction_count']; ?> Transactions</p>
                                    </div>
                                </div>
                                <span class="font-serif font-bold text-brand-black text-lg"><?php echo formatCurrency($method['total_amount']); ?></span>
                            </div>
                            <?php endforeach; ?>
                        </div>
                    </div>

                    <!-- Product Sales Breakdown (Top 4) -->
                    <div class="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
                        <div class="flex justify-between items-center mb-6">
                            <h3 class="font-serif text-lg font-bold text-brand-black">Top Products</h3>
                            <button class="text-brand text-xs font-bold hover:text-brand-dark transition-colors">View All</button>
                        </div>
                        <div class="flex-1 w-full">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr>
                                        <th class="pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">Item</th>
                                        <th class="pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 text-center">Qty</th>
                                        <th class="pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 text-right">Revenue</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-50">
                                    <?php foreach ($topProducts as $product): ?>
                                    <tr class="hover:bg-gray-50 transition-colors">
                                        <td class="py-2.5 font-bold text-sm text-brand-black"><?php echo htmlspecialchars($product['name']); ?></td>
                                        <td class="py-2.5 text-center text-sm font-semibold text-gray-600"><?php echo $product['total_quantity']; ?></td>
                                        <td class="py-2.5 text-right font-serif font-bold text-brand-black"><?php echo formatCurrency($product['total_revenue']); ?></td>
                                    </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

                <!-- 5. Discounts & Cashiers -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div class="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <h3 class="font-serif text-lg font-bold text-brand-black mb-5">Discount Impact</h3>
                        <div class="grid grid-cols-2 gap-3">
                            <div class="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Discounts</p>
                                <p class="font-serif text-2xl font-bold text-brand-black mt-1"><?php echo formatCurrency($salesSummary['total_discounts'] ?? 0); ?></p>
                            </div>
                            <div class="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Discounted Orders</p>
                                <p class="font-serif text-2xl font-bold text-brand-black mt-1"><?php echo (int)($salesSummary['discounted_orders'] ?? 0); ?></p>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <h3 class="font-serif text-lg font-bold text-brand-black mb-5">Cashier Breakdown</h3>
                        <div class="space-y-3 max-h-56 overflow-y-auto pr-1">
                            <?php foreach ($cashierBreakdown as $cashier): ?>
                            <div class="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl">
                                <div>
                                    <p class="font-bold text-sm text-brand-black"><?php echo htmlspecialchars($cashier['full_name']); ?></p>
                                    <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider"><?php echo (int)$cashier['order_count']; ?> orders · Avg <?php echo formatCurrency($cashier['avg_order_value']); ?></p>
                                </div>
                                <p class="font-serif font-bold text-brand-black"><?php echo formatCurrency($cashier['total_sales']); ?></p>
                            </div>
                            <?php endforeach; ?>
                            <?php if (empty($cashierBreakdown)): ?>
                            <p class="text-sm text-gray-400 text-center py-8">No cashier sales in this period</p>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>

                <!-- 6. Detailed Transaction Table -->
                <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-8">
                    <!-- Table Header Tools -->
                    <div class="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-vintage-paper">
                        <div>
                            <h3 class="font-serif text-xl font-bold text-brand-black">Detailed Transactions</h3>
                            <p class="text-xs text-gray-500 mt-1 font-medium">Complete ledger of all orders recorded.</p>
                        </div>
                        
                        <form method="GET" action="sales.php" class="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                            <input type="hidden" name="date_filter" value="<?php echo htmlspecialchars($dateFilter); ?>">
                            <input type="hidden" name="chart_view" value="<?php echo htmlspecialchars($chartView); ?>">
                            <?php if ($dateFilter === 'custom'): ?>
                            <input type="hidden" name="start_date" value="<?php echo htmlspecialchars(date('Y-m-d', strtotime($startDate))); ?>">
                            <input type="hidden" name="end_date" value="<?php echo htmlspecialchars(date('Y-m-d', strtotime($endDate))); ?>">
                            <?php endif; ?>
                            <div class="flex items-center gap-1.5">
                                <label for="transactionStartDate" class="sr-only">Transaction start date</label>
                                <input id="transactionStartDate" type="date" name="transaction_start_date" value="<?php echo htmlspecialchars($transactionStartInput); ?>" aria-label="Transaction start date" class="bg-white border border-gray-200 h-9 rounded-md px-2 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand" title="Transaction start date">
                                <span class="text-xs text-gray-400 font-semibold">to</span>
                                <label for="transactionEndDate" class="sr-only">Transaction end date</label>
                                <input id="transactionEndDate" type="date" name="transaction_end_date" value="<?php echo htmlspecialchars($transactionEndInput); ?>" aria-label="Transaction end date" class="bg-white border border-gray-200 h-9 rounded-md px-2 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand" title="Transaction end date">
                            </div>
                            <div class="relative w-full sm:w-64">
                                <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                                <input type="text" name="search" value="<?php echo htmlspecialchars($transactionSearch); ?>" placeholder="Search order, cashier, customer..." class="w-full bg-white h-9 rounded-md pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand border border-gray-200 shadow-sm">
                            </div>
                            <select name="payment_method" class="bg-white border border-gray-200 h-9 rounded-md px-2 text-sm font-semibold text-gray-600">
                                <option value="">All Payments</option>
                                <option value="cash" <?php echo $paymentFilter === 'cash' ? 'selected' : ''; ?>>Cash</option>
                                <option value="card" <?php echo $paymentFilter === 'card' ? 'selected' : ''; ?>>Card</option>
                                <option value="gcash" <?php echo $paymentFilter === 'gcash' ? 'selected' : ''; ?>>GCash</option>
                            </select>
                            <select name="order_type" class="bg-white border border-gray-200 h-9 rounded-md px-2 text-sm font-semibold text-gray-600">
                                <option value="">All Types</option>
                                <option value="dine_in" <?php echo $orderTypeFilter === 'dine_in' ? 'selected' : ''; ?>>Dine In</option>
                                <option value="take_away" <?php echo $orderTypeFilter === 'take_away' ? 'selected' : ''; ?>>Take Out</option>
                                <option value="delivery" <?php echo $orderTypeFilter === 'delivery' ? 'selected' : ''; ?>>Delivery</option>
                            </select>
                            <select name="cashier_id" class="bg-white border border-gray-200 h-9 rounded-md px-2 text-sm font-semibold text-gray-600">
                                <option value="0">All Cashiers</option>
                                <?php foreach ($cashiers as $cashier): ?>
                                <option value="<?php echo (int)$cashier['id']; ?>" <?php echo $cashierFilter === (int)$cashier['id'] ? 'selected' : ''; ?>><?php echo htmlspecialchars($cashier['full_name']); ?></option>
                                <?php endforeach; ?>
                            </select>
                            <button class="bg-white border border-gray-300 text-gray-600 px-3 py-1.5 rounded-md text-sm font-bold shadow-sm hover:text-brand-black hover:border-brand-black transition-colors flex items-center gap-2">
                                <i class="fa-solid fa-filter"></i> Apply
                            </button>
                        </form>
                    </div>
                    
                    <!-- Scrollable Table Body -->
                    <div class="w-full overflow-x-auto">
                        <table class="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr class="bg-gray-50 border-b border-gray-200">
                                    <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID</th>
                                    <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Date & Time</th>
                                    <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Type / Table</th>
                                    <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Items</th>
                                    <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Payment</th>
                                    <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Cashier</th>
                                    <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Total Amount</th>
                                    <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100">
                                <?php foreach ($transactions as $transaction): ?>
                                <tr class="hover:bg-brand-light/20 transition-colors">
                                    <td class="py-4 px-6 font-bold text-sm text-brand-black"><?php echo htmlspecialchars($transaction['order_number']); ?></td>
                                    <td class="py-4 px-6 text-sm text-gray-600 font-medium"><?php echo date('m/d/y', strtotime($transaction['created_at'])); ?><br><span class="text-xs text-gray-400"><?php echo date('h:i A', strtotime($transaction['created_at'])); ?></span></td>
                                    <td class="py-4 px-6">
                                        <?php if ($transaction['table_number']): ?>
                                        <span class="text-xs font-bold text-brand-black bg-gray-100 px-2 py-1 rounded border border-gray-200"><i class="fa-solid fa-utensils text-brand mr-1"></i> T<?php echo $transaction['table_number']; ?></span>
                                        <?php else: ?>
                                        <span class="text-xs font-bold text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-100"><i class="fa-solid fa-bag-shopping text-gray-400 mr-1"></i> <?php echo ucfirst(str_replace('_', ' ', $transaction['order_type'])); ?></span>
                                        <?php endif; ?>
                                    </td>
                                    <td class="py-4 px-6 text-center font-bold text-gray-600"><?php echo $transaction['item_count']; ?></td>
                                    <td class="py-4 px-6">
                                        <span class="text-xs font-bold text-brand-black flex items-center gap-1">
                                            <?php 
                                            $icon = 'fa-solid fa-money-bill-wave text-brand';
                                            if ($transaction['payment_method'] === 'card') $icon = 'fa-regular fa-credit-card text-gray-500';
                                            elseif ($transaction['payment_method'] === 'gcash') $icon = 'fa-solid fa-mobile-screen text-blue-500';
                                            ?>
                                            <i class="<?php echo $icon; ?>"></i> <?php echo ucfirst($transaction['payment_method']); ?>
                                        </span>
                                    </td>
                                    <td class="py-4 px-6 text-sm text-gray-600 font-medium"><?php echo htmlspecialchars($transaction['cashier_name'] ?? 'N/A'); ?></td>
                                    <td class="py-4 px-6 text-right font-serif font-bold text-brand-black text-lg"><?php echo formatCurrency($transaction['total_amount']); ?></td>
                                    <td class="py-4 px-6 text-center">
                                        <button onclick="viewOrder(<?php echo (int)$transaction['id']; ?>)" class="text-gray-400 hover:text-brand-black transition-colors"><i class="fa-regular fa-eye"></i></button>
                                    </td>
                                </tr>
                                <?php endforeach; ?>
                                <?php if (empty($transactions)): ?>
                                <tr>
                                    <td colspan="8" class="py-10 text-center text-gray-400 text-sm">No transactions match the selected filters</td>
                                </tr>
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

    <!-- Custom Date Modal -->
    <div id="customDateModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 hidden">
        <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200">
            <h3 class="text-xl font-serif font-bold text-brand-black mb-4">Custom Sales Range</h3>
            <form action="sales.php" method="GET" class="space-y-4">
                <input type="hidden" name="date_filter" value="custom">
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Start Date</label>
                    <input type="date" name="start_date" value="<?php echo htmlspecialchars(date('Y-m-d', strtotime($startDate))); ?>" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">End Date</label>
                    <input type="date" name="end_date" value="<?php echo htmlspecialchars(date('Y-m-d', strtotime($endDate))); ?>" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                </div>
                <div class="flex gap-3 pt-4">
                    <button type="button" onclick="hideCustomDateModal()" class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                    <button type="submit" class="flex-1 bg-brand-black text-brand py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors">Apply</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Order Details Modal -->
    <div id="orderDetailsModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 hidden">
        <div class="bg-white rounded-2xl max-w-lg w-full mx-4 shadow-2xl border border-gray-200 max-h-[90vh] overflow-hidden flex flex-col">
            <div class="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
                <div>
                    <p id="orderDetailsNumber" class="text-xs font-bold text-gray-500 uppercase tracking-wider">Order</p>
                    <h3 id="orderDetailsCustomer" class="text-2xl font-serif font-bold text-brand-black mt-1">Transaction Details</h3>
                    <p id="orderDetailsMeta" class="text-sm text-gray-500 mt-1"></p>
                </div>
                <button type="button" onclick="hideOrderDetailsModal()" class="w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:text-brand-black hover:bg-gray-200 transition-colors shrink-0">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="p-6 overflow-y-auto">
                <div id="orderDetailsItems" class="space-y-3 mb-5"></div>
                <div class="border-t border-gray-200 pt-4 space-y-2">
                    <div class="flex justify-between text-sm"><span class="text-gray-600">Subtotal</span><span id="orderDetailsSubtotal" class="font-bold"></span></div>
                    <div class="flex justify-between text-sm"><span class="text-gray-600">Discount</span><span id="orderDetailsDiscount" class="font-bold text-green-600"></span></div>
                    <div class="flex justify-between text-sm"><span class="text-gray-600">Tax</span><span id="orderDetailsTax" class="font-bold"></span></div>
                    <div class="flex justify-between text-lg pt-2 border-t border-gray-100"><span class="font-bold">Total</span><span id="orderDetailsTotal" class="font-bold"></span></div>
                </div>
            </div>
            <div class="p-6 border-t border-gray-100 bg-gray-50">
                <button type="button" onclick="hideOrderDetailsModal()" class="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">Close</button>
            </div>
        </div>
    </div>

    <script>
        // Sales Trend Chart
        const salesTrendCtx = document.getElementById('salesTrendChart').getContext('2d');
        new Chart(salesTrendCtx, {
            type: 'line',
            data: {
                labels: <?php echo json_encode($salesTrendLabels); ?>,
                datasets: [{
                    label: 'Sales',
                    data: <?php echo json_encode($salesTrend); ?>,
                    borderColor: '#FBBF24',
                    backgroundColor: 'rgba(251, 191, 36, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#FBBF24',
                    pointBorderColor: '#171717',
                    pointBorderWidth: 2,
                    pointRadius: 4
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

        // Category Sales Chart
        const categorySalesCtx = document.getElementById('categorySalesChart').getContext('2d');
        new Chart(categorySalesCtx, {
            type: 'doughnut',
            data: {
                labels: <?php echo json_encode(array_slice(array_column($categorySales, 'category_name'), 0, 4)); ?>,
                datasets: [{
                    data: <?php echo json_encode(array_slice(array_column($categorySales, 'total_sales'), 0, 4)); ?>,
                    backgroundColor: ['#171717', '#FBBF24', '#D97706', '#D1D5DB'],
                    borderWidth: 0
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
                cutout: '60%'
            }
        });

        function showLogoutModal() {
            document.getElementById('logoutModal').classList.remove('hidden');
        }
        
        function hideLogoutModal() {
            document.getElementById('logoutModal').classList.add('hidden');
        }

        function showCustomDateModal() {
            document.getElementById('customDateModal').classList.remove('hidden');
        }

        function hideCustomDateModal() {
            document.getElementById('customDateModal').classList.add('hidden');
        }

        function formatPeso(amount) {
            return new Intl.NumberFormat('en-PH', {
                style: 'currency',
                currency: 'PHP',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(Number(amount) || 0);
        }

        function escapeHtml(value) {
            const div = document.createElement('div');
            div.textContent = value || '';
            return div.innerHTML;
        }

        function hideOrderDetailsModal() {
            document.getElementById('orderDetailsModal').classList.add('hidden');
        }

        function viewOrder(orderId) {
            const modal = document.getElementById('orderDetailsModal');
            const itemsContainer = document.getElementById('orderDetailsItems');
            itemsContainer.innerHTML = '<p class="text-center text-sm text-gray-400 py-6">Loading transaction...</p>';
            modal.classList.remove('hidden');

            fetch('api.php?action=get_order_details&order_id=' + encodeURIComponent(orderId))
                .then(response => response.json())
                .then(data => {
                    if (!data.success) {
                        itemsContainer.innerHTML = '<p class="text-center text-sm text-red-600 py-6">' + (data.error || 'Unable to load transaction.') + '</p>';
                        return;
                    }

                    const order = data.data.order;
                    const items = data.data.items || [];
                    const tableLabel = order.table_number ? 'Table ' + order.table_number : order.order_type.replace('_', ' ');
                    const createdAt = new Date(order.created_at.replace(' ', 'T'));

                    document.getElementById('orderDetailsNumber').textContent = 'Order #' + order.order_number;
                    document.getElementById('orderDetailsCustomer').textContent = order.customer_name || 'Guest';
                    document.getElementById('orderDetailsMeta').textContent = tableLabel + ' · ' + order.payment_method + ' · ' + createdAt.toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                    });
                    document.getElementById('orderDetailsSubtotal').textContent = formatPeso(order.subtotal);
                    document.getElementById('orderDetailsDiscount').textContent = '-' + formatPeso(order.discount_amount);
                    document.getElementById('orderDetailsTax').textContent = formatPeso(order.tax_amount);
                    document.getElementById('orderDetailsTotal').textContent = formatPeso(order.total_amount);

                    itemsContainer.innerHTML = items.map(item => `
                        <div class="flex justify-between gap-4 rounded-xl border border-gray-200 bg-white p-3">
                            <div>
                                <p class="font-bold text-sm text-brand-black">${escapeHtml(item.name)}</p>
                                <p class="text-xs text-gray-500 mt-1">${formatPeso(item.unit_price)} each</p>
                            </div>
                            <div class="text-right">
                                <p class="text-sm font-bold text-brand-black">${item.quantity}x</p>
                                <p class="text-xs text-gray-500 mt-1">${formatPeso(item.total_price)}</p>
                            </div>
                        </div>
                    `).join('') || '<p class="text-center text-sm text-gray-400 py-6">No items found</p>';
                })
                .catch(() => {
                    itemsContainer.innerHTML = '<p class="text-center text-sm text-red-600 py-6">Unable to load transaction.</p>';
                });
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
