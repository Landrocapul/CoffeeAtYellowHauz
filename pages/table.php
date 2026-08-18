<?php
require_once __DIR__ . '/../db.php';

// Check if user is logged in
if (!isLoggedIn()) {
    redirect('index.php');
}

// Check if user has cashier access (both cashier and admin can access table services)
if (!hasCashierAccess()) {
    redirect('menu.php');
}

// Get current user info
$currentUser = getCurrentUser();

// Handle table status updates
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    requireCsrfToken();
    $action = $_POST['action'];
    $tableId = isset($_POST['table_id']) ? (int)$_POST['table_id'] : 0;
    
    if ($action === 'update_status') {
        $status = sanitize($_POST['status']);
        $allowedStatuses = ['available', 'reserved', 'cleaning'];
        if (!in_array($status, $allowedStatuses, true)) {
            $error = 'Invalid table status.';
        } else {
        try {
            $stmt = $pdo->prepare("UPDATE tables SET status = ?, current_order_id = NULL WHERE id = ?");
            $stmt->execute([$status, $tableId]);
            redirect('table.php');
        } catch (PDOException $e) {
            $error = 'Failed to update table status: ' . $e->getMessage();
        }
        }
    } elseif ($action === 'add_table') {
        $tableNumber = (int)$_POST['table_number'];
        $capacity = max(1, min(12, (int)$_POST['capacity']));
        $area = sanitize($_POST['area'] ?? 'normal');
        if (!in_array($area, ['normal', 'airconditioned'], true)) {
            $area = 'normal';
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO tables (table_number, capacity, area, status) VALUES (?, ?, ?, 'available')");
            $stmt->execute([$tableNumber, $capacity, $area]);
            redirect('table.php');
        } catch (PDOException $e) {
            $error = 'Failed to add table: ' . $e->getMessage();
        }
    } elseif ($action === 'create_order') {
        $tableId = (int)$_POST['table_id'];
        $customerName = sanitize($_POST['customer_name']);
        $orderType = sanitize($_POST['order_type']);
        
        try {
            $tableStmt = $pdo->prepare("SELECT status, current_order_id FROM tables WHERE id = ?");
            $tableStmt->execute([$tableId]);
            $selectedTable = $tableStmt->fetch();
            if (!$selectedTable || $selectedTable['status'] === 'occupied' || !empty($selectedTable['current_order_id'])) {
                throw new Exception('This table already has an active order.');
            }

            $orderNumber = generateOrderNumber();
            $stmt = $pdo->prepare("INSERT INTO orders (order_number, table_id, customer_name, order_type, cashier_id, status) VALUES (?, ?, ?, ?, ?, 'pending')");
            $stmt->execute([$orderNumber, $tableId, $customerName, $orderType, $currentUser['id']]);
            
            // Update table status
            $updateStmt = $pdo->prepare("UPDATE tables SET status = 'occupied', current_order_id = ? WHERE id = ?");
            $updateStmt->execute([$pdo->lastInsertId(), $tableId]);
            
            redirect('menu.php');
        } catch (Exception $e) {
            $error = 'Failed to create order: ' . $e->getMessage();
        }
    }
}

// Get all tables with their current order info
$stmt = $pdo->query("SELECT t.*, o.customer_name, o.order_type, o.created_at as order_created_at
                    FROM tables t
                    LEFT JOIN orders o ON t.current_order_id = o.id
                    ORDER BY t.table_number ASC");
$allTables = $stmt->fetchAll();
$tableStatusFilter = $_GET['status'] ?? 'all';
$allowedTableFilters = ['all', 'available', 'occupied', 'reserved', 'cleaning'];
if (!in_array($tableStatusFilter, $allowedTableFilters, true)) {
    $tableStatusFilter = 'all';
}
$tableAreaFilter = $_GET['area'] ?? 'all';
$allowedAreaFilters = ['all', 'normal', 'airconditioned'];
if (!in_array($tableAreaFilter, $allowedAreaFilters, true)) {
    $tableAreaFilter = 'all';
}

$tableStats = [
    'all' => count($allTables),
    'available' => 0,
    'occupied' => 0,
    'reserved' => 0,
    'cleaning' => 0,
];
foreach ($allTables as $table) {
    $isOccupied = $table['status'] === 'occupied' || !empty($table['current_order_id']);
    if ($isOccupied) {
        $tableStats['occupied']++;
    } elseif (isset($tableStats[$table['status']])) {
        $tableStats[$table['status']]++;
    }
}

$tables = array_values(array_filter($allTables, function ($table) use ($tableStatusFilter) {
    if ($tableStatusFilter === 'all') {
        return true;
    }
    if ($tableStatusFilter === 'occupied') {
        return $table['status'] === 'occupied' || !empty($table['current_order_id']);
    }
    return $table['status'] === $tableStatusFilter && empty($table['current_order_id']);
}));
$tables = array_values(array_filter($tables, function ($table) use ($tableAreaFilter) {
    if ($tableAreaFilter === 'all') {
        return true;
    }
    $tableArea = $table['area'] ?? (((int)$table['table_number'] >= 5) ? 'airconditioned' : 'normal');
    $isAirconditioned = $tableArea === 'airconditioned';
    return $tableAreaFilter === 'airconditioned' ? $isAirconditioned : !$isAirconditioned;
}));
$nextTableNumber = empty($allTables) ? 1 : ((int)max(array_column($allTables, 'table_number')) + 1);

$floorColumns = [[], [], [], []];
foreach ($tables as $index => $table) {
    $floorColumns[$index % 4][] = $table;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yellow Hauz POS - Table Services</title>
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
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
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

    <?php if (!empty($error)): ?>
    <div class="fixed top-5 right-5 z-[60] bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-lg text-sm font-medium">
        <?php echo htmlspecialchars($error); ?>
    </div>
    <?php endif; ?>

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
                    <a href="table.php" class="flex items-center gap-4 bg-brand-black text-brand px-4 py-3.5 rounded-2xl font-semibold shadow-md transition-all">
                        <i class="fa-solid fa-utensils w-5 text-center"></i> <span class="nav-text">Table Services</span>
                    </a>
                    <a href="ticket.php" class="flex items-center gap-4 text-gray-500 hover:text-brand-black hover:bg-gray-100 px-4 py-3.5 rounded-2xl font-medium transition-all">
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

        <main class="flex-1 flex flex-col relative bg-vintage-paper overflow-hidden">
            <!-- Top Header -->
            <header class="h-[88px] flex items-center justify-between px-8 shrink-0 border-b border-gray-200/50">
                <button id="sidebarToggle" class="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-500 hover:text-brand-black">
                    <i class="fa-solid fa-bars"></i>
                </button>
                
                <div class="flex-1 mx-6 min-w-0 flex items-center gap-3 overflow-x-auto hide-scrollbar">
                    <h2 class="text-2xl font-serif font-bold text-brand-black tracking-wide uppercase leading-tight shrink-0">TABLES</h2>
                    <div class="flex items-center gap-3">
                        <!-- Status Filters -->
                        <div class="flex items-center bg-white border border-gray-200 p-1 rounded-full shadow-sm">
                            <?php
                            $filterLabels = [
                                'all' => 'All',
                                'available' => 'Available',
                                'occupied' => 'Occupied',
                                'reserved' => 'Reserved',
                                'cleaning' => 'Cleaning',
                            ];
                            foreach ($filterLabels as $filterKey => $filterLabel):
                                $filterClass = $tableStatusFilter === $filterKey
                                    ? 'bg-brand-black text-brand font-bold shadow-sm'
                                    : 'text-gray-500 hover:text-brand-black font-semibold';
                            ?>
                            <a href="table.php?status=<?php echo $filterKey; ?>&area=<?php echo urlencode($tableAreaFilter); ?>" class="<?php echo $filterClass; ?> px-3 py-1.5 rounded-full text-xs transition-all">
                                <?php echo $filterLabel; ?>
                            </a>
                            <?php endforeach; ?>
                        </div>
                        <div class="hidden md:flex items-center bg-white border border-gray-200 p-1 rounded-full shadow-sm">
                            <?php
                            $areaLabels = [
                                'all' => 'All Areas',
                                'normal' => 'Normal',
                                'airconditioned' => 'Airconditioned',
                            ];
                            foreach ($areaLabels as $areaKey => $areaLabel):
                                $areaClass = $tableAreaFilter === $areaKey
                                    ? 'bg-brand-black text-brand font-bold shadow-sm'
                                    : 'text-gray-500 hover:text-brand-black font-semibold';
                            ?>
                            <a href="table.php?status=<?php echo urlencode($tableStatusFilter); ?>&area=<?php echo $areaKey; ?>" class="<?php echo $areaClass; ?> px-3 py-1.5 rounded-full text-xs transition-all">
                                <?php echo $areaLabel; ?>
                            </a>
                            <?php endforeach; ?>
                        </div>
                </div>
                
                <button onclick="showAddTableModal()" class="w-10 h-10 bg-brand-black text-brand rounded-xl shadow-sm border border-brand flex items-center justify-center hover:bg-gray-800 transition-colors" title="Add table">
                    <i class="fa-solid fa-plus"></i>
                </button>
            </header>

            <!-- Scrollable Table Layout -->
            <div class="flex-1 overflow-y-auto px-6 lg:px-10 pb-10 pt-8 hide-scrollbar relative">
                <!-- Floor Plan Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-8 xl:gap-x-10 gap-y-10 w-full max-w-7xl mx-auto">
                    <?php foreach ($floorColumns as $column): ?>
                    <div class="flex flex-col gap-10 xl:gap-12">
                        <?php foreach ($column as $table): ?>
                        <?php
                            $isLargeTable = (int)$table['capacity'] > 4;
                            $isActive = $table['status'] === 'occupied' || !empty($table['current_order_id']);
                            $isReserved = $table['status'] === 'reserved';
                            $isAvailable = $table['status'] === 'available';
                            $chairCount = max(1, min(12, (int)$table['capacity']));
                            $firstSideChairs = (int)ceil($chairCount / 2);
                            $secondSideChairs = (int)floor($chairCount / 2);
                            $tableHeight = $isLargeTable ? 'h-[240px] xl:h-[300px]' : 'h-[140px] xl:h-[170px]';
                            $statusLabel = str_replace('_', ' ', $table['status']);
                            $tableArea = $table['area'] ?? (((int)$table['table_number'] >= 5) ? 'airconditioned' : 'normal');
                            $areaLabel = $tableArea === 'airconditioned' ? 'Airconditioned' : 'Normal';
                            $displayName = $table['customer_name'] ?: ($isReserved ? 'Reserved Guest' : '');
                            $displayTime = !empty($table['order_created_at']) ? date('h:i A', strtotime($table['order_created_at'])) : '';
                            $boxClasses = 'relative z-10 w-full h-full rounded-[24px] p-4 flex flex-col justify-between transition-all cursor-pointer ';

                            if ($isActive) {
                                $boxClasses .= 'bg-brand-black text-white border-2 border-brand shadow-[4px_4px_0px_0px_rgba(251,191,36,1)] scale-[1.02]';
                            } elseif ($isReserved) {
                                $boxClasses .= 'bg-brand-light border-2 border-brand shadow-sm';
                            } else {
                                $boxClasses .= 'bg-white border border-gray-300 shadow-sm hover:border-brand';
                            }
                        ?>
                        <div class="relative w-full <?php echo $tableHeight; ?>">
                            <?php if ($isLargeTable): ?>
                            <div class="absolute -left-5 top-1/2 -translate-y-1/2 flex flex-col justify-center gap-4 z-0 h-[90%]">
                                <?php for ($chair = 0; $chair < $firstSideChairs; $chair++): ?>
                                <div class="w-9 h-14 border-2 border-gray-400 rounded-l-full bg-white"></div>
                                <?php endfor; ?>
                            </div>
                            <div class="absolute -right-5 top-1/2 -translate-y-1/2 flex flex-col justify-center gap-4 z-0 h-[90%]">
                                <?php for ($chair = 0; $chair < $secondSideChairs; $chair++): ?>
                                <div class="w-9 h-14 border-2 border-gray-400 rounded-r-full bg-white"></div>
                                <?php endfor; ?>
                            </div>
                            <?php else: ?>
                            <div class="absolute -top-5 left-1/2 -translate-x-1/2 flex justify-center gap-5 z-0 w-full">
                                <?php for ($chair = 0; $chair < $firstSideChairs; $chair++): ?>
                                <div class="w-14 h-9 border-2 border-gray-400 rounded-t-full bg-white"></div>
                                <?php endfor; ?>
                            </div>
                            <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 flex justify-center gap-5 z-0 w-full">
                                <?php for ($chair = 0; $chair < $secondSideChairs; $chair++): ?>
                                <div class="w-14 h-9 border-2 border-gray-400 rounded-b-full bg-white"></div>
                                <?php endfor; ?>
                            </div>
                            <?php endif; ?>

                            <div class="<?php echo $boxClasses; ?>" onclick="showTableDetails(<?php echo (int)$table['id']; ?>)">
                                <div class="flex justify-between items-start">
                                    <div class="w-8 h-8 rounded-full <?php echo $isActive ? 'bg-brand text-brand-black' : ($isReserved ? 'bg-brand text-brand-black border border-brand-black' : 'bg-gray-100 text-gray-500 border border-gray-200'); ?> font-bold flex items-center justify-center text-sm">
                                        T<?php echo htmlspecialchars($table['table_number']); ?>
                                    </div>
                                    <?php if ($displayTime): ?>
                                    <span class="text-xs font-semibold <?php echo $isActive ? 'text-brand' : 'text-brand-dark'; ?>"><?php echo $displayTime; ?></span>
                                    <?php endif; ?>
                                </div>

                                <?php if ($displayName): ?>
                                <div>
                                    <h3 class="font-serif font-bold <?php echo $isActive ? 'text-white' : 'text-brand-black'; ?> text-lg leading-tight"><?php echo htmlspecialchars($displayName); ?></h3>
                                    <p class="text-xs <?php echo $isActive ? 'text-white/70' : 'text-gray-600'; ?> font-medium"><?php echo (int)$table['capacity']; ?> Guests</p>
                                </div>
                                <?php endif; ?>

                                <div class="absolute bottom-4 right-4 flex items-center gap-1.5">
                                    <span class="bg-white/80 text-gray-600 border border-gray-200 text-[9px] px-2 py-1 rounded uppercase tracking-wider font-bold">
                                        <?php echo htmlspecialchars($areaLabel); ?>
                                    </span>
                                    <span class="<?php echo $isActive ? 'bg-white/10 text-brand border border-white/20' : ($isReserved ? 'bg-brand-black text-brand' : 'bg-gray-100 text-gray-500 border border-gray-200'); ?> text-[9px] px-2 py-1 rounded uppercase tracking-wider font-bold">
                                        <?php echo htmlspecialchars($statusLabel); ?>
                                    </span>
                                </div>
                            </div>
                        </div>
                        <?php endforeach; ?>
                    </div>
                    <?php endforeach; ?>
                </div>
                <?php if (empty($tables)): ?>
                <div class="text-center py-16 text-gray-400">
                    <i class="fa-solid fa-chair text-4xl mb-3"></i>
                    <p class="text-sm font-medium">No <?php echo htmlspecialchars($filterLabels[$tableStatusFilter]); ?> tables</p>
                </div>
                <?php endif; ?>
            </div>
        </main>

    </div>

    <!-- Add Table Modal -->
    <div id="addTableModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 hidden">
        <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200">
            <h3 class="text-xl font-serif font-bold text-brand-black mb-4">Add Table</h3>
            <form action="table.php?status=<?php echo htmlspecialchars($tableStatusFilter); ?>" method="POST" class="space-y-4">
                <?php echo csrfField(); ?>
                <input type="hidden" name="action" value="add_table">
                
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Table Number</label>
                    <input type="number" name="table_number" min="1" value="<?php echo (int)$nextTableNumber; ?>" required class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Number of Chairs</label>
                    <select name="capacity" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                        <?php for ($chairs = 1; $chairs <= 12; $chairs++): ?>
                        <option value="<?php echo $chairs; ?>" <?php echo $chairs === 4 ? 'selected' : ''; ?>>
                            <?php echo $chairs; ?> <?php echo $chairs === 1 ? 'Chair' : 'Chairs'; ?>
                        </option>
                        <?php endfor; ?>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Area</label>
                    <select name="area" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                        <option value="normal">Normal</option>
                        <option value="airconditioned">Airconditioned</option>
                    </select>
                </div>
                
                <div class="flex gap-3 pt-4">
                    <button type="button" onclick="hideAddTableModal()" class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                        Cancel
                    </button>
                    <button type="submit" class="flex-1 bg-brand-black text-brand py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors">
                        Add Table
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Table Details Modal -->
    <div id="tableModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 hidden">
        <div class="relative bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200">
            <button type="button" onclick="hideTableModal()" class="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:text-brand-black hover:bg-gray-200 transition-colors">
                <i class="fa-solid fa-xmark"></i>
            </button>
            <p id="modalTableStatus" class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Table</p>
            <h3 id="modalTableTitle" class="text-2xl font-serif font-bold text-brand-black mb-1">Table Details</h3>
            <p id="modalTableMeta" class="text-sm text-gray-500 mb-5"></p>

            <div id="modalTableGuest" class="hidden bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Current Guest</p>
                <p id="modalTableGuestName" class="font-bold text-brand-black"></p>
                <p id="modalTableOrderMeta" class="text-xs text-gray-500 mt-1"></p>
            </div>

            <form id="tableStatusForm" action="table.php?status=<?php echo htmlspecialchars($tableStatusFilter); ?>" method="POST" class="grid grid-cols-3 gap-2 mb-5">
                <?php echo csrfField(); ?>
                <input type="hidden" name="action" value="update_status">
                <input type="hidden" name="table_id" id="statusTableId">
                <button type="submit" name="status" value="available" class="bg-green-50 text-green-700 border border-green-200 py-2.5 rounded-xl text-xs font-bold hover:bg-green-100 transition-colors">Available</button>
                <button type="submit" name="status" value="reserved" class="bg-brand-light text-brand-dark border border-brand py-2.5 rounded-xl text-xs font-bold hover:bg-brand transition-colors">Reserved</button>
                <button type="submit" name="status" value="cleaning" class="bg-blue-50 text-blue-700 border border-blue-200 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors">Cleaning</button>
            </form>

            <div id="occupiedTableNotice" class="hidden bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-4 mb-5 text-sm font-medium">
                Complete the active ticket before creating a new order for this table.
            </div>

            <form id="createOrderForm" action="table.php?status=<?php echo htmlspecialchars($tableStatusFilter); ?>" method="POST" class="space-y-4">
                <?php echo csrfField(); ?>
                <input type="hidden" name="action" value="create_order">
                <input type="hidden" name="table_id" id="modalTableId">
                
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Customer Name</label>
                    <input type="text" name="customer_name" placeholder="Enter customer name" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Order Type</label>
                    <select name="order_type" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                        <option value="dine_in">Dine In</option>
                        <option value="take_away">Take Away</option>
                        <option value="delivery">Delivery</option>
                    </select>
                </div>
                
                <div class="flex gap-3 pt-4">
                    <button type="button" onclick="hideTableModal()" class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                        Cancel
                    </button>
                    <button type="submit" class="flex-1 bg-brand-black text-brand py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors">
                        Create Order
                    </button>
                </div>
            </form>
        </div>
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

    <script>
        const tablesData = <?php echo json_encode(array_map(function ($table) {
            return [
                'id' => (int)$table['id'],
                'table_number' => $table['table_number'],
                'capacity' => (int)$table['capacity'],
                'status' => $table['status'],
                'current_order_id' => $table['current_order_id'] ? (int)$table['current_order_id'] : null,
                'customer_name' => $table['customer_name'],
                'order_type' => $table['order_type'],
                'order_created_at' => $table['order_created_at'],
            ];
        }, $allTables)); ?>;

        function formatStatus(status) {
            return (status || '').replace('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
        }

        function formatOrderType(type) {
            return type === 'dine_in' ? 'Dine In' : type === 'take_away' ? 'Take Out' : 'Delivery';
        }

        function showTableDetails(tableId) {
            const table = tablesData.find(item => item.id === tableId);
            if (!table) return;

            const isOccupied = table.status === 'occupied' || Boolean(table.current_order_id);
            const guestBox = document.getElementById('modalTableGuest');
            const statusForm = document.getElementById('tableStatusForm');
            const orderForm = document.getElementById('createOrderForm');
            const occupiedNotice = document.getElementById('occupiedTableNotice');

            document.getElementById('modalTableId').value = tableId;
            document.getElementById('statusTableId').value = tableId;
            document.getElementById('modalTableStatus').textContent = formatStatus(isOccupied ? 'occupied' : table.status);
            document.getElementById('modalTableTitle').textContent = 'Table ' + table.table_number;
            document.getElementById('modalTableMeta').textContent = table.capacity + (table.capacity === 1 ? ' chair' : ' chairs');

            if (table.customer_name || table.order_created_at) {
                guestBox.classList.remove('hidden');
                document.getElementById('modalTableGuestName').textContent = table.customer_name || 'Guest';
                document.getElementById('modalTableOrderMeta').textContent = [
                    table.order_type ? formatOrderType(table.order_type) : '',
                    table.order_created_at ? new Date(table.order_created_at.replace(' ', 'T')).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''
                ].filter(Boolean).join(' · ');
            } else {
                guestBox.classList.add('hidden');
            }

            statusForm.classList.toggle('hidden', isOccupied);
            orderForm.classList.toggle('hidden', isOccupied);
            occupiedNotice.classList.toggle('hidden', !isOccupied);

            document.getElementById('tableModal').classList.remove('hidden');
        }

        function hideTableModal() {
            document.getElementById('tableModal').classList.add('hidden');
        }

        function showAddTableModal() {
            document.getElementById('addTableModal').classList.remove('hidden');
        }

        function hideAddTableModal() {
            document.getElementById('addTableModal').classList.add('hidden');
        }

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


