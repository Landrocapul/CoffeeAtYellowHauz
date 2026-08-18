<?php
require_once __DIR__ . '/../db.php';

// Check if user is logged in
if (!isLoggedIn()) {
    redirect('index.php');
}

// Check if user has cashier access (both cashier and admin can access tickets)
if (!hasCashierAccess()) {
    redirect('menu.php');
}

// Get current user info
$currentUser = getCurrentUser();

function ticketUrl(array $overrides = []) {
    $params = array_merge($_GET, $overrides);
    foreach ($params as $key => $value) {
        if ($value === '' || $value === null) {
            unset($params[$key]);
        }
    }
    return 'ticket.php' . (empty($params) ? '' : '?' . http_build_query($params));
}

function ticketWaitMinutes($createdAt) {
    return max(0, (int)floor((time() - strtotime($createdAt)) / 60));
}

function ticketWaitLabel($createdAt) {
    $minutes = ticketWaitMinutes($createdAt);
    if ($minutes < 1) return 'Just now';
    if ($minutes < 60) return $minutes . ' min ago';
    $hours = (int)floor($minutes / 60);
    $remaining = $minutes % 60;
    return $hours . 'h' . ($remaining > 0 ? ' ' . $remaining . 'm' : '') . ' ago';
}

function ticketOrderTypeLabel($type) {
    return $type === 'dine_in' ? 'Dine In' : ($type === 'take_away' ? 'Take Out' : 'Delivery');
}

function ticketDateInput($value, $fallback) {
    if (!is_string($value) || !preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $parts) || !checkdate((int)$parts[2], (int)$parts[3], (int)$parts[1])) {
        return $fallback;
    }
    return $value;
}

$allowedTicketFilters = ['processing', 'today', 'completed', 'cancelled', 'custom'];
$ticketFilter = $_GET['filter'] ?? ($_SESSION['ticket_filter'] ?? 'today');
if (!in_array($ticketFilter, $allowedTicketFilters, true)) {
    $ticketFilter = 'today';
}
$_SESSION['ticket_filter'] = $ticketFilter;
$ticketSearch = sanitize($_GET['search'] ?? '');
$ticketStartDate = ticketDateInput($_GET['start_date'] ?? null, date('Y-m-d'));
$ticketEndDate = ticketDateInput($_GET['end_date'] ?? null, date('Y-m-d'));
if ($ticketStartDate > $ticketEndDate) {
    [$ticketStartDate, $ticketEndDate] = [$ticketEndDate, $ticketStartDate];
}
$activeTabClass = 'px-3 py-1.5 rounded-md bg-brand-light text-brand-dark font-bold border border-brand/20 shadow-sm transition-all';
$inactiveTabClass = 'px-3 py-1.5 rounded-md text-gray-500 hover:text-brand-black font-semibold transition-all';

$where = [];
$params = [];
if (in_array($ticketFilter, ['processing', 'completed', 'cancelled'], true)) {
    $where[] = 'o.status = ?';
    $params[] = $ticketFilter;
} elseif ($ticketFilter === 'today') {
    $where[] = 'DATE(o.created_at) = CURDATE()';
} elseif ($ticketFilter === 'custom') {
    $where[] = 'o.created_at BETWEEN ? AND ?';
    $params[] = $ticketStartDate . ' 00:00:00';
    $params[] = $ticketEndDate . ' 23:59:59';
}
if ($ticketSearch !== '') {
    $where[] = '(o.order_number LIKE ? OR o.customer_name LIKE ? OR t.table_number LIKE ? OR u.full_name LIKE ?)';
    $like = '%' . $ticketSearch . '%';
    array_push($params, $like, $like, $like, $like);
}
$whereSql = empty($where) ? '' : 'WHERE ' . implode(' AND ', $where);

$stmt = $pdo->prepare("SELECT o.*, t.table_number, u.full_name as cashier_name
                      FROM orders o
                      LEFT JOIN tables t ON o.table_id = t.id
                      LEFT JOIN users u ON o.cashier_id = u.id
                      {$whereSql}
                      ORDER BY FIELD(o.status, 'pending', 'processing', 'completed', 'cancelled'), o.created_at DESC
                      LIMIT 80");
$stmt->execute($params);
$tickets = $stmt->fetchAll();

$ticketItems = [];
if (!empty($tickets)) {
    $ticketIds = array_map(fn($ticket) => (int)$ticket['id'], $tickets);
    $placeholders = implode(',', array_fill(0, count($ticketIds), '?'));
    $stmt = $pdo->prepare("SELECT oi.*, mi.name
                          FROM order_items oi
                          JOIN menu_items mi ON oi.menu_item_id = mi.id
                          WHERE oi.order_id IN ({$placeholders})
                          ORDER BY oi.id ASC");
    $stmt->execute($ticketIds);
    foreach ($stmt->fetchAll() as $item) {
        $ticketItems[(int)$item['order_id']][] = $item;
    }
}

$stmt = $pdo->query("SELECT
                    SUM(status = 'processing') as processing_count,
                    SUM(status = 'completed' AND DATE(created_at) = CURDATE()) as completed_today_count,
                    SUM(status = 'cancelled' AND DATE(created_at) = CURDATE()) as cancelled_today_count,
                    SUM(DATE(created_at) = CURDATE()) as today_count,
                    COUNT(*) as total_count
                    FROM orders");
$ticketStats = $stmt->fetch();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yellow Hauz POS - Tickets</title>
    <link rel="icon" type="image/svg+xml" href="images/favicon.svg">
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,500&display=swap" rel="stylesheet">
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
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
                    <a href="ticket.php" class="flex items-center gap-4 bg-brand-black text-brand px-4 py-3.5 rounded-2xl font-semibold shadow-md transition-all">
                        <i class="fa-solid fa-receipt w-5 text-center"></i> <span class="nav-text">Tickets</span>
                    </a>
                    <?php if (isAdmin()): ?>
                    <a href="items.php" class="flex items-center gap-4 text-gray-500 hover:text-brand-black hover:bg-gray-100 px-4 py-3.5 rounded-2xl font-medium transition-all">
                        <i class="fa-solid fa-clipboard-list w-5 text-center"></i> <span class="nav-text">Manage Food Items</span>
                    </a>
                    <a href="sales.php" class="flex items-center gap-4 text-gray-500 hover:text-brand-black hover:bg-gray-100 px-4 py-3.5 rounded-2xl font-medium transition-all">
                        <i class="fa-solid fa-chart-line w-5 text-center"></i> <span class="nav-text">Sales Report</span>
                    </a>
                    <a href="analysis.php" class="flex items-center gap-4 text-gray-500 hover:text-brand-black hover:bg-gray-100 px-4 py-3.5 rounded-2xl font-medium transition-all">
                        <i class="fa-solid fa-chart-pie w-5 text-center"></i> <span class="nav-text">Product Analytics</span>
                    </a>
                    <a href="settings.php" class="flex items-center gap-4 text-gray-500 hover:text-brand-black hover:bg-gray-100 px-4 py-3.5 rounded-2xl font-medium transition-all">
                        <i class="fa-solid fa-gear w-5 text-center"></i> <span class="nav-text">Settings</span>
                    </a>
                    <?php endif; ?>
                </nav>
            </div>

            <!-- Bottom Users / Logout -->
            <div class="space-y-4">
                <div class="space-y-3 px-2">
                    <a id="sidebarProfileLink" href="profile.php" class="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-gray-100">
                        <div class="w-8 h-8 shrink-0 rounded-full bg-brand text-brand-black flex items-center justify-center text-xs font-bold relative">
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
                
                <h2 class="text-2xl font-serif font-bold text-brand-black tracking-wide">TICKETS</h2>
                
                <form method="GET" action="ticket.php" class="flex flex-wrap items-center justify-end gap-3">
                    <input type="hidden" name="filter" value="<?php echo htmlspecialchars($ticketFilter); ?>">
                    <?php if ($ticketFilter === 'custom'): ?>
                    <div class="flex items-center gap-1.5">
                        <label for="ticketStartDate" class="sr-only">Ticket start date</label>
                        <input id="ticketStartDate" type="date" name="start_date" value="<?php echo htmlspecialchars($ticketStartDate); ?>" aria-label="Ticket start date" class="bg-white border border-gray-200 h-10 rounded-xl px-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand shadow-sm">
                        <span class="text-xs text-gray-400 font-semibold">to</span>
                        <label for="ticketEndDate" class="sr-only">Ticket end date</label>
                        <input id="ticketEndDate" type="date" name="end_date" value="<?php echo htmlspecialchars($ticketEndDate); ?>" aria-label="Ticket end date" class="bg-white border border-gray-200 h-10 rounded-xl px-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand shadow-sm">
                    </div>
                    <?php endif; ?>
                    <div class="relative">
                        <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                        <input type="text" name="search" value="<?php echo htmlspecialchars($ticketSearch); ?>" placeholder="Search tickets..." class="w-[240px] bg-white h-10 rounded-xl pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-brand shadow-sm border border-gray-200">
                        <?php if ($ticketSearch !== ''): ?>
                        <a href="<?php echo ticketUrl(['search' => null]); ?>" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-black transition-colors">
                            <i class="fa-solid fa-xmark"></i>
                        </a>
                        <?php endif; ?>
                    </div>
                    <button type="submit" class="w-10 h-10 bg-brand-black text-brand rounded-xl shadow-sm border border-brand-black flex items-center justify-center hover:bg-gray-800 transition-colors" title="Search">
                        <i class="fa-solid fa-filter"></i>
                    </button>
                    <button type="button" onclick="window.location.reload()" class="w-10 h-10 bg-white text-gray-500 rounded-xl shadow-sm border border-gray-200 flex items-center justify-center hover:text-brand-black transition-colors" title="Refresh tickets">
                        <i class="fa-solid fa-rotate-right"></i>
                    </button>
                </form>
            </header>

            <div class="flex-1 min-w-0 overflow-y-auto px-8 pb-8 pt-6">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <a href="<?php echo ticketUrl(['filter' => 'processing']); ?>" class="bg-white rounded-2xl border <?php echo $ticketFilter === 'processing' ? 'border-brand' : 'border-gray-200'; ?> p-4 shadow-sm">
                        <p class="text-xs text-gray-500 font-bold uppercase tracking-wider">Processing</p>
                        <p class="font-serif text-3xl font-bold text-brand-black mt-1"><?php echo (int)$ticketStats['processing_count']; ?></p>
                    </a>
                    <a href="<?php echo ticketUrl(['filter' => 'completed']); ?>" class="bg-white rounded-2xl border <?php echo $ticketFilter === 'completed' ? 'border-brand' : 'border-gray-200'; ?> p-4 shadow-sm">
                        <p class="text-xs text-gray-500 font-bold uppercase tracking-wider">Completed Today</p>
                        <p class="font-serif text-3xl font-bold text-brand-black mt-1"><?php echo (int)$ticketStats['completed_today_count']; ?></p>
                    </a>
                    <a href="<?php echo ticketUrl(['filter' => 'today']); ?>" class="bg-white rounded-2xl border <?php echo $ticketFilter === 'today' ? 'border-brand' : 'border-gray-200'; ?> p-4 shadow-sm">
                        <p class="text-xs text-gray-500 font-bold uppercase tracking-wider">Today</p>
                        <p class="font-serif text-3xl font-bold text-brand-black mt-1"><?php echo (int)$ticketStats['today_count']; ?></p>
                    </a>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <div class="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm text-sm overflow-x-auto">
                        <a href="<?php echo ticketUrl(['filter' => 'processing']); ?>" class="<?php echo $ticketFilter === 'processing' ? $activeTabClass : $inactiveTabClass; ?>">Processing</a>
                        <a href="<?php echo ticketUrl(['filter' => 'today']); ?>" class="<?php echo $ticketFilter === 'today' ? $activeTabClass : $inactiveTabClass; ?>">Today</a>
                        <a href="<?php echo ticketUrl(['filter' => 'completed']); ?>" class="<?php echo $ticketFilter === 'completed' ? $activeTabClass : $inactiveTabClass; ?>">Completed</a>
                        <a href="<?php echo ticketUrl(['filter' => 'cancelled']); ?>" class="<?php echo $ticketFilter === 'cancelled' ? $activeTabClass : $inactiveTabClass; ?>">Cancelled</a>
                        <a href="<?php echo ticketUrl(['filter' => 'custom']); ?>" class="<?php echo $ticketFilter === 'custom' ? $activeTabClass : $inactiveTabClass; ?>"><i class="fa-regular fa-calendar mr-1"></i>Custom</a>
                    </div>
                    <p class="text-xs text-gray-500 font-bold uppercase tracking-wider"><?php echo count($tickets); ?> ticket(s)</p>
                </div>

                <?php if (empty($tickets)): ?>
                <div class="bg-white border border-gray-200 rounded-2xl min-h-[320px] flex flex-col items-center justify-center text-center text-gray-400 shadow-sm">
                    <i class="fa-solid fa-receipt text-5xl mb-4"></i>
                    <p class="text-lg font-serif font-bold text-brand-black">No tickets found</p>
                    <p class="text-sm mt-1"><?php echo $ticketSearch !== '' ? 'Try a different search or filter.' : 'No orders match this view right now.'; ?></p>
                </div>
                <?php else: ?>
                <div class="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                    <?php foreach ($tickets as $ticket): ?>
                    <?php
                        $status = $ticket['status'];
                        $items = $ticketItems[(int)$ticket['id']] ?? [];
                        $waitMinutes = ticketWaitMinutes($ticket['created_at']);
                        $isLate = in_array($status, ['pending', 'processing'], true) && $waitMinutes >= 20;
                        $statusClass = $status === 'processing' ? 'bg-brand-light text-brand-dark border-brand/30' : ($status === 'pending' ? 'bg-gray-100 text-gray-700 border-gray-200' : ($status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'));
                        $cardBorder = $isLate ? 'border-red-300' : ($status === 'processing' ? 'border-brand' : 'border-gray-200');
                        $tableLabel = $ticket['table_number'] ? 'Table ' . $ticket['table_number'] : 'Take Out';
                    ?>
                    <article class="bg-white rounded-2xl border-2 <?php echo $cardBorder; ?> p-5 shadow-sm hover:shadow-md transition-all flex flex-col">
                        <div class="flex items-start justify-between gap-4 mb-4">
                            <div class="flex items-center gap-3 min-w-0">
                                <div class="w-14 h-14 rounded-2xl <?php echo $status === 'processing' ? 'bg-brand text-brand-black' : 'bg-gray-100 text-gray-600'; ?> flex items-center justify-center font-bold text-lg shrink-0">
                                    <?php echo $ticket['table_number'] ? 'T' . $ticket['table_number'] : 'TA'; ?>
                                </div>
                                <div class="min-w-0">
                                    <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider"><?php echo htmlspecialchars($ticket['order_number']); ?></p>
                                    <h4 class="font-serif text-xl font-bold text-brand-black leading-tight truncate"><?php echo htmlspecialchars($ticket['customer_name'] ?? 'Guest'); ?></h4>
                                    <p class="text-xs text-gray-500 mt-1"><?php echo htmlspecialchars($tableLabel); ?> &middot; <?php echo ticketOrderTypeLabel($ticket['order_type']); ?> &middot; <?php echo date('h:i A', strtotime($ticket['created_at'])); ?></p>
                                </div>
                            </div>
                            <span class="text-xs font-bold px-2.5 py-1 rounded-lg border uppercase shrink-0 <?php echo $statusClass; ?>"><?php echo htmlspecialchars($status); ?></span>
                        </div>

                        <div class="flex flex-wrap gap-2 mb-4">
                            <span class="text-xs font-bold px-2.5 py-1 rounded-lg <?php echo $isLate ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-gray-50 text-gray-600 border border-gray-200'; ?>">
                                <i class="fa-regular fa-clock mr-1"></i><?php echo ticketWaitLabel($ticket['created_at']); ?>
                            </span>
                            <span class="text-xs font-bold px-2.5 py-1 rounded-lg bg-gray-50 text-gray-600 border border-gray-200">
                                <i class="fa-solid fa-user mr-1"></i><?php echo htmlspecialchars($ticket['cashier_name'] ?? 'Cashier'); ?>
                            </span>
                            <span class="text-xs font-bold px-2.5 py-1 rounded-lg bg-gray-50 text-gray-600 border border-gray-200">
                                <i class="fa-solid <?php echo $ticket['payment_method'] === 'cash' ? 'fa-money-bill-wave' : ($ticket['payment_method'] === 'gcash' ? 'fa-mobile-screen' : 'fa-credit-card'); ?> mr-1"></i><?php echo strtoupper($ticket['payment_method']); ?>
                            </span>
                        </div>

                        <div class="space-y-2 mb-4 flex-1">
                            <?php foreach (array_slice($items, 0, 4) as $item): ?>
                            <div class="flex justify-between items-center text-sm gap-3">
                                <span class="font-medium truncate"><?php echo htmlspecialchars($item['name']); ?></span>
                                <span class="text-gray-600 font-bold shrink-0"><?php echo (int)$item['quantity']; ?>x</span>
                            </div>
                            <?php endforeach; ?>
                            <?php if (count($items) > 4): ?>
                            <p class="text-xs text-gray-400 font-bold">+<?php echo count($items) - 4; ?> more item(s)</p>
                            <?php endif; ?>
                        </div>

                        <div class="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
                            <span class="font-serif text-xl font-bold text-brand-black"><?php echo formatCurrency($ticket['total_amount']); ?></span>
                            <div class="flex flex-wrap gap-2 justify-end">
                                <button onclick="viewOrder(<?php echo (int)$ticket['id']; ?>)" class="px-3 py-2 bg-brand-light text-brand-dark rounded-xl text-xs font-bold hover:bg-brand hover:text-brand-black transition-colors"><i class="fa-regular fa-eye mr-1"></i>View</button>
                                <button onclick="printOrder(<?php echo (int)$ticket['id']; ?>)" class="px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:text-brand-black hover:border-brand-black transition-colors"><i class="fa-solid fa-print mr-1"></i>Print</button>
                                <?php if ($status === 'pending'): ?>
                                <button onclick="confirmStatusChange(<?php echo (int)$ticket['id']; ?>, 'processing')" class="px-3 py-2 bg-brand text-brand-black rounded-xl text-xs font-bold hover:bg-brand-dark hover:text-white transition-colors">Start</button>
                                <?php endif; ?>
                                <?php if ($status === 'pending' || $status === 'processing'): ?>
                                <button onclick="confirmStatusChange(<?php echo (int)$ticket['id']; ?>, 'completed')" class="px-3 py-2 bg-brand-black text-brand rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors">Complete</button>
                                <button onclick="showVoidApproval(<?php echo (int)$ticket['id']; ?>)" class="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-600 hover:text-white transition-colors">Void</button>
                                <?php endif; ?>
                            </div>
                        </div>
                    </article>
                    <?php endforeach; ?>
                </div>
                <?php endif; ?>
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

    <!-- Administrator approval for ticket voids -->
    <div id="voidApprovalModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] hidden">
        <div class="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl border border-gray-200">
            <div class="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><i class="fa-solid fa-ban text-2xl"></i></div>
            <h3 class="text-xl font-serif font-bold text-brand-black text-center mb-2">Void ticket approval</h3>
            <p class="text-sm text-gray-600 text-center mb-5">An active administrator must enter their PIN to void this ticket.</p>
            <label for="voidAdminPin" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Administrator PIN</label>
            <input id="voidAdminPin" type="password" inputmode="numeric" autocomplete="one-time-code" maxlength="12" class="w-full border border-gray-200 rounded-xl px-4 py-3 text-center tracking-[0.35em] text-lg focus:outline-none focus:ring-2 focus:ring-brand" placeholder="••••">
            <p id="voidApprovalError" class="hidden text-sm text-red-600 mt-2"></p>
            <div class="flex gap-3 pt-5">
                <button type="button" onclick="hideVoidApproval()" class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                <button id="voidApprovalButton" type="button" class="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors">Void Ticket</button>
            </div>
        </div>
    </div>

    <!-- Ticket Details Modal -->
    <div id="ticketDetailsModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 hidden">
        <div class="bg-white rounded-2xl max-w-lg w-full mx-4 shadow-2xl border border-gray-200 max-h-[90vh] overflow-hidden flex flex-col">
            <div class="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
                <div>
                    <p id="ticketDetailsOrderNumber" class="text-xs font-bold text-gray-500 uppercase tracking-wider">Order</p>
                    <h3 id="ticketDetailsCustomer" class="text-2xl font-serif font-bold text-brand-black mt-1">Ticket Details</h3>
                    <p id="ticketDetailsMeta" class="text-sm text-gray-500 mt-1"></p>
                </div>
                <button type="button" onclick="hideTicketDetailsModal()" class="w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:text-brand-black hover:bg-gray-200 transition-colors shrink-0">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div class="p-6 overflow-y-auto">
                <div class="grid grid-cols-2 gap-3 mb-5">
                    <div class="bg-gray-50 border border-gray-200 rounded-xl p-3">
                        <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Status</p>
                        <p id="ticketDetailsStatus" class="text-sm font-bold text-brand-black mt-1">-</p>
                    </div>
                    <div class="bg-gray-50 border border-gray-200 rounded-xl p-3">
                        <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Payment</p>
                        <p id="ticketDetailsPayment" class="text-sm font-bold text-brand-black mt-1">-</p>
                    </div>
                </div>

                <div id="ticketDetailsItems" class="space-y-3 mb-5"></div>

                <div class="border-t border-gray-200 pt-4 space-y-2">
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-600">Subtotal</span>
                        <span id="ticketDetailsSubtotal" class="font-bold text-brand-black">-</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-600">Tax</span>
                        <span id="ticketDetailsTax" class="font-bold text-brand-black">-</span>
                    </div>
                    <div class="flex justify-between text-lg pt-2 border-t border-gray-100">
                        <span class="font-bold text-brand-black">Total</span>
                        <span id="ticketDetailsTotal" class="font-bold text-brand-black">-</span>
                    </div>
                </div>
            </div>

            <div class="p-6 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-3">
                <button type="button" onclick="hideTicketDetailsModal()" class="flex-1 min-w-[120px] bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                    Close
                </button>
                <button id="ticketDetailsPrintButton" type="button" class="flex-1 min-w-[120px] bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:border-brand-black hover:text-brand-black transition-colors hidden">
                    <i class="fa-solid fa-print mr-2"></i>Print
                </button>
                <button id="ticketDetailsStartButton" type="button" class="flex-1 min-w-[120px] bg-brand text-brand-black py-3 rounded-xl font-bold hover:bg-brand-dark hover:text-white transition-colors hidden">
                    Start
                </button>
                <button id="ticketDetailsCompleteButton" type="button" class="flex-1 min-w-[120px] bg-brand-black text-brand py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors hidden">
                    Complete
                </button>
                <button id="ticketDetailsCancelButton" type="button" class="flex-1 min-w-[120px] bg-red-50 text-red-600 border border-red-200 py-3 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-colors hidden">
                    Void
                </button>
            </div>
        </div>
    </div>

    <!-- Confirmation Modal -->
    <div id="ticketConfirmModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] hidden">
        <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200">
            <div class="flex items-center justify-center w-14 h-14 bg-brand-light rounded-full mx-auto mb-4">
                <i id="ticketConfirmIcon" class="fa-solid fa-circle-check text-brand-dark text-2xl"></i>
            </div>
            <h3 id="ticketConfirmTitle" class="text-xl font-serif font-bold text-brand-black text-center mb-2">Update ticket?</h3>
            <p id="ticketConfirmMessage" class="text-gray-600 text-center mb-6">Please confirm this ticket update.</p>
            <div class="flex gap-3">
                <button onclick="hideTicketConfirmModal()" class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                    Keep
                </button>
                <button id="ticketConfirmButton" class="flex-1 bg-brand-black text-brand py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors">
                    Confirm
                </button>
            </div>
        </div>
    </div>

    <script>
        function showLogoutModal() {
            document.getElementById('logoutModal').classList.remove('hidden');
        }
        
        function hideLogoutModal() {
            document.getElementById('logoutModal').classList.add('hidden');
        }

        function formatPeso(amount) {
            return new Intl.NumberFormat('en-PH', {
                style: 'currency',
                currency: 'PHP',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(Number(amount) || 0);
        }

        function formatOrderType(type) {
            return type === 'dine_in' ? 'Dine In' : type === 'take_away' ? 'Take Out' : 'Delivery';
        }

        function formatStatus(status) {
            return status ? status.charAt(0).toUpperCase() + status.slice(1) : '-';
        }

        function formatPaymentMethod(method) {
            if (method === 'gcash') return 'GCash';
            return method ? method.charAt(0).toUpperCase() + method.slice(1) : '-';
        }

        function escapeHtml(value) {
            const div = document.createElement('div');
            div.textContent = value || '';
            return div.innerHTML;
        }

        function hideTicketDetailsModal() {
            document.getElementById('ticketDetailsModal').classList.add('hidden');
        }

        function hideTicketConfirmModal() {
            document.getElementById('ticketConfirmModal').classList.add('hidden');
            document.getElementById('ticketConfirmButton').onclick = null;
        }

        function showVoidApproval(orderId) {
            const modal = document.getElementById('voidApprovalModal');
            const pinInput = document.getElementById('voidAdminPin');
            const error = document.getElementById('voidApprovalError');
            pinInput.value = '';
            error.textContent = '';
            error.classList.add('hidden');
            document.getElementById('voidApprovalButton').onclick = () => voidTicket(orderId);
            modal.classList.remove('hidden');
            setTimeout(() => pinInput.focus(), 0);
        }

        function hideVoidApproval() {
            document.getElementById('voidApprovalModal').classList.add('hidden');
            document.getElementById('voidApprovalButton').onclick = null;
        }

        function voidTicket(orderId) {
            const pinInput = document.getElementById('voidAdminPin');
            const error = document.getElementById('voidApprovalError');
            const button = document.getElementById('voidApprovalButton');
            if (!pinInput.value.trim()) {
                error.textContent = 'Enter the administrator PIN.';
                error.classList.remove('hidden');
                pinInput.focus();
                return;
            }

            button.disabled = true;
            button.textContent = 'Approving...';
            fetch('api.php?action=void_ticket', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': '<?php echo csrfToken(); ?>',
                },
                body: JSON.stringify({ order_id: orderId, admin_pin: pinInput.value })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.reload();
                    return;
                }
                error.textContent = data.error || 'Unable to void this ticket.';
                error.classList.remove('hidden');
                pinInput.value = '';
                pinInput.focus();
            })
            .catch(() => {
                error.textContent = 'Unable to contact the server. Please try again.';
                error.classList.remove('hidden');
            })
            .finally(() => {
                button.disabled = false;
                button.textContent = 'Void Ticket';
            });
        }

        function confirmStatusChange(orderId, status) {
            const title = {
                processing: 'Start this ticket?',
                completed: 'Complete this ticket?',
                cancelled: 'Cancel this ticket?'
            }[status] || 'Update this ticket?';
            const message = {
                processing: 'This moves the order into the processing queue.',
                completed: 'This marks the order as finished and frees the table.',
                cancelled: 'This cancels the order and frees the table. This action should be intentional.'
            }[status] || 'Please confirm this ticket update.';
            const icon = document.getElementById('ticketConfirmIcon');
            const confirmButton = document.getElementById('ticketConfirmButton');

            document.getElementById('ticketConfirmTitle').textContent = title;
            document.getElementById('ticketConfirmMessage').textContent = message;
            icon.className = 'fa-solid text-2xl ' + (status === 'cancelled' ? 'fa-triangle-exclamation text-red-600' : 'fa-circle-check text-brand-dark');
            confirmButton.className = 'flex-1 py-3 rounded-xl font-bold transition-colors ' + (status === 'cancelled' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-brand-black text-brand hover:bg-gray-800');
            confirmButton.textContent = status === 'processing' ? 'Start' : (status === 'completed' ? 'Complete' : 'Cancel');
            confirmButton.onclick = () => updateOrderStatus(orderId, status);
            document.getElementById('ticketConfirmModal').classList.remove('hidden');
        }

        function viewOrder(orderId) {
            const modal = document.getElementById('ticketDetailsModal');
            const itemsContainer = document.getElementById('ticketDetailsItems');
            const printButton = document.getElementById('ticketDetailsPrintButton');
            const startButton = document.getElementById('ticketDetailsStartButton');
            const completeButton = document.getElementById('ticketDetailsCompleteButton');
            const cancelButton = document.getElementById('ticketDetailsCancelButton');

            itemsContainer.innerHTML = '<p class="text-center text-sm text-gray-400 py-6">Loading ticket...</p>';
            [printButton, startButton, completeButton, cancelButton].forEach(button => {
                button.classList.add('hidden');
                button.onclick = null;
            });
            completeButton.classList.add('hidden');
            modal.classList.remove('hidden');

            fetch('api.php?action=get_order_details&order_id=' + encodeURIComponent(orderId))
                .then(response => response.json())
                .then(data => {
                    if (!data.success) {
                        itemsContainer.innerHTML = '<p class="text-center text-sm text-red-600 py-6">' + (data.error || 'Unable to load ticket.') + '</p>';
                        return;
                    }

                    const order = data.data.order;
                    const items = data.data.items || [];
                    const tableLabel = order.table_number ? 'Table ' + order.table_number : 'Take Out';
                    const createdAt = new Date(order.created_at.replace(' ', 'T'));

                    document.getElementById('ticketDetailsOrderNumber').textContent = 'Order #' + order.order_number;
                    document.getElementById('ticketDetailsCustomer').textContent = order.customer_name || 'Guest';
                    document.getElementById('ticketDetailsMeta').textContent = tableLabel + ' - ' + formatOrderType(order.order_type) + ' - ' + createdAt.toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                    });
                    document.getElementById('ticketDetailsStatus').textContent = formatStatus(order.status);
                    document.getElementById('ticketDetailsPayment').textContent = formatPaymentMethod(order.payment_method);
                    document.getElementById('ticketDetailsSubtotal').textContent = formatPeso(order.subtotal);
                    document.getElementById('ticketDetailsTax').textContent = formatPeso(order.tax_amount);
                    document.getElementById('ticketDetailsTotal').textContent = formatPeso(order.total_amount);

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

                    printButton.classList.remove('hidden');
                    printButton.onclick = () => printOrder(Number(order.id));
                    if (order.status === 'pending') {
                        startButton.classList.remove('hidden');
                        startButton.onclick = () => confirmStatusChange(Number(order.id), 'processing');
                    }
                    if (order.status === 'pending' || order.status === 'processing') {
                        completeButton.classList.remove('hidden');
                        cancelButton.classList.remove('hidden');
                        completeButton.onclick = () => confirmStatusChange(Number(order.id), 'completed');
                        cancelButton.onclick = () => showVoidApproval(Number(order.id));
                    }
                })
                .catch(() => {
                    itemsContainer.innerHTML = '<p class="text-center text-sm text-red-600 py-6">Unable to load ticket.</p>';
                });
        }

        function updateOrderStatus(orderId, status) {
            fetch('api.php?action=update_order_status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': '<?php echo csrfToken(); ?>',
                },
                body: JSON.stringify({
                    order_id: orderId,
                    status: status
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.reload();
                    return;
                }

                alert(data.error || 'Unable to update order.');
            })
            .catch(() => {
                alert('Unable to update order.');
            });
        }

        function completeOrder(orderId) {
            confirmStatusChange(orderId, 'completed');
        }

        function printOrder(orderId) {
            fetch('api.php?action=get_order_details&order_id=' + encodeURIComponent(orderId))
                .then(response => response.json())
                .then(data => {
                    if (!data.success) {
                        alert(data.error || 'Unable to load ticket for printing.');
                        return;
                    }

                    const order = data.data.order;
                    const items = data.data.items || [];
                    const tableLabel = order.table_number ? 'Table ' + order.table_number : 'Take Out';
                    const rows = items.map(item => `
                        <tr>
                            <td>${escapeHtml(item.name)}</td>
                            <td style="text-align:center;">${item.quantity}</td>
                            <td style="text-align:right;">${formatPeso(item.total_price)}</td>
                        </tr>
                    `).join('');
                    const printWindow = window.open('', '_blank', 'width=420,height=640');
                    if (!printWindow) {
                        alert('Please allow popups to print this ticket.');
                        return;
                    }

                    printWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>Ticket ${escapeHtml(order.order_number)}</title>
                            <style>
                                body { font-family: Arial, sans-serif; padding: 18px; color: #171717; }
                                h1 { font-size: 20px; margin: 0; text-align: center; }
                                .muted { color: #666; font-size: 12px; }
                                .center { text-align: center; }
                                .line { border-top: 1px dashed #999; margin: 14px 0; }
                                table { width: 100%; border-collapse: collapse; font-size: 13px; }
                                td { padding: 5px 0; vertical-align: top; }
                                .total { font-size: 18px; font-weight: 700; text-align: right; }
                            </style>
                        </head>
                        <body>
                            <h1>Coffee at Yellow Hauz</h1>
                            <p class="center muted">Kitchen / Order Ticket</p>
                            <div class="line"></div>
                            <p><strong>Order:</strong> ${escapeHtml(order.order_number)}<br>
                            <strong>Customer:</strong> ${escapeHtml(order.customer_name || 'Guest')}<br>
                            <strong>Type:</strong> ${escapeHtml(formatOrderType(order.order_type))}<br>
                            <strong>Table:</strong> ${escapeHtml(tableLabel)}<br>
                            <strong>Status:</strong> ${escapeHtml(formatStatus(order.status))}</p>
                            <div class="line"></div>
                            <table>${rows}</table>
                            <div class="line"></div>
                            <p class="total">${formatPeso(order.total_amount)}</p>
                            <p class="center muted">${new Date().toLocaleString()}</p>
                        </body>
                        </html>
                    `);
                    printWindow.document.close();
                    printWindow.focus();
                    printWindow.print();
                })
                .catch(() => {
                    alert('Unable to print ticket.');
                });
        }

        setInterval(() => {
            const detailsOpen = !document.getElementById('ticketDetailsModal').classList.contains('hidden');
            const confirmOpen = !document.getElementById('ticketConfirmModal').classList.contains('hidden');
            const activeElement = document.activeElement;
            const typing = activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName);
            if (!detailsOpen && !confirmOpen && !typing) {
                window.location.reload();
            }
        }, 30000);

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
        const profileLink = document.getElementById('sidebarProfileLink');
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
        if (profileLink) {
            profileLink.classList.add('justify-center', 'p-0');
            profileLink.classList.remove('gap-3', 'p-2');
        }

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
            if (profileLink) {
                profileLink.classList.remove('justify-center', 'p-0');
                profileLink.classList.add('gap-3', 'p-2');
            }
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
                if (profileLink) {
                    profileLink.classList.add('justify-center', 'p-0');
                    profileLink.classList.remove('gap-3', 'p-2');
                }
                
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
                if (profileLink) {
                    profileLink.classList.remove('justify-center', 'p-0');
                    profileLink.classList.add('gap-3', 'p-2');
                }
            }
        });
    </script>
    <?php include __DIR__ . '/staff_chatbot.php'; ?>
</body>
</html>
