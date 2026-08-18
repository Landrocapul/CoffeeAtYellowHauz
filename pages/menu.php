<?php
require_once __DIR__ . '/../db.php';

// Check if user is logged in
if (!isLoggedIn()) {
    redirect('index.php');
}

// Get current user info
$currentUser = getCurrentUser();
$timeMenus = getTimeMenus();

function timeToMinutes($time) {
    [$hours, $minutes] = array_pad(explode(':', $time), 2, 0);
    return ((int)$hours * 60) + (int)$minutes;
}

function isCurrentTimeMenu($timeMenu) {
    $now = ((int)date('H') * 60) + (int)date('i');
    $start = timeToMinutes($timeMenu['start'] ?? '00:00');
    $end = timeToMinutes($timeMenu['end'] ?? '23:59');

    if ($start <= $end) {
        return $now >= $start && $now <= $end;
    }

    return $now >= $start || $now <= $end;
}

$activeTimeMenu = $timeMenus[0] ?? null;
foreach ($timeMenus as $timeMenu) {
    if (isCurrentTimeMenu($timeMenu)) {
        $activeTimeMenu = $timeMenu;
        break;
    }
}

// Get categories
$stmt = $pdo->query("SELECT * FROM categories WHERE status = 'active' ORDER BY sort_order ASC");
$categories = $stmt->fetchAll();

function categoryMenuType($categoryName) {
    $name = strtolower($categoryName);
    $foodKeywords = ['food', 'add-on food', 'addon food', 'appetizer', 'rice', 'breakfast', 'pasta', 'starter', 'salad', 'pizza', 'sandwich', 'sandwiches', 'dessert', 'desserts', 'pastry', 'pastries', 'cake', 'cookie', 'bread', 'meal', 'snack'];

    foreach ($foodKeywords as $keyword) {
        if (strpos($name, $keyword) !== false) {
            return 'food';
        }
    }

    return 'drinks';
}

$menuType = $_GET['type'] ?? 'drinks';
if (!in_array($menuType, ['drinks', 'food'], true)) {
    $menuType = 'drinks';
}

$categoriesByType = [
    'drinks' => [],
    'food' => [],
];

foreach ($categories as $category) {
    $categoriesByType[categoryMenuType($category['name'])][] = $category;
}

$visibleCategories = $categoriesByType[$menuType];
if (empty($visibleCategories)) {
    $visibleCategories = $categories;
}

// Get selected category (default to first category in the selected menu type)
$selectedCategoryId = isset($_GET['category']) ? (int)$_GET['category'] : (isset($visibleCategories[0]['id']) ? (int)$visibleCategories[0]['id'] : 0);
if ($selectedCategoryId > 0) {
    $selectedCategoryType = null;
    foreach ($categories as $category) {
        if ((int)$category['id'] === $selectedCategoryId) {
            $selectedCategoryType = categoryMenuType($category['name']);
            break;
        }
    }

    if ($selectedCategoryType !== null && $selectedCategoryType !== $menuType && !empty($visibleCategories)) {
        $selectedCategoryId = (int)$visibleCategories[0]['id'];
    }
}

$searchTerm = sanitize($_GET['search'] ?? '');
$visibleCategoryIds = array_map(fn($category) => (int)$category['id'], $visibleCategories);

// Get menu items for selected category
$menuItems = [];
if ($searchTerm !== '') {
    $searchLike = '%' . $searchTerm . '%';
    $typeWhereSql = '';
    $typeParams = [];
    if (!empty($visibleCategoryIds)) {
        $typeWhereSql = ' AND mi.category_id IN (' . implode(',', array_fill(0, count($visibleCategoryIds), '?')) . ')';
        $typeParams = $visibleCategoryIds;
    }
    $stmt = $pdo->prepare("SELECT mi.*, c.name as category_name, c.icon as category_icon 
                          FROM menu_items mi 
                          JOIN categories c ON mi.category_id = c.id 
                          WHERE mi.is_available = 1 
                          {$typeWhereSql}
                          AND (mi.name LIKE ? OR mi.description LIKE ? OR c.name LIKE ?)
                          ORDER BY c.sort_order ASC, mi.sort_order ASC");
    $stmt->execute(array_merge($typeParams, [$searchLike, $searchLike, $searchLike]));
    $menuItems = $stmt->fetchAll();
} elseif ($selectedCategoryId > 0) {
    $stmt = $pdo->prepare("SELECT mi.*, c.name as category_name, c.icon as category_icon 
                          FROM menu_items mi 
                          JOIN categories c ON mi.category_id = c.id 
                          WHERE mi.category_id = ? AND mi.is_available = 1 
                          ORDER BY mi.sort_order ASC");
    $stmt->execute([$selectedCategoryId]);
    $menuItems = $stmt->fetchAll();
}
$menuItemCount = count($menuItems);
$useXLargeItemCards = $menuItemCount < 7;
$useLargeItemCards = $menuItemCount < 10;

// Get category item counts
$categoryCounts = [];
foreach ($categories as $cat) {
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM menu_items WHERE category_id = ? AND is_available = 1");
    $stmt->execute([$cat['id']]);
    $categoryCounts[$cat['id']] = $stmt->fetch()['count'];
}

// Get tables
$stmt = $pdo->query("SELECT * FROM tables ORDER BY table_number ASC");
$tables = $stmt->fetchAll();
$availableTables = array_values(array_filter($tables, function ($table) {
    return $table['status'] === 'available';
}));

// Get active orders (for bottom bar)
$stmt = $pdo->prepare("SELECT o.*, t.table_number, u.full_name as cashier_name 
                      FROM orders o 
                      LEFT JOIN tables t ON o.table_id = t.id 
                      LEFT JOIN users u ON o.cashier_id = u.id 
                      WHERE o.status IN ('pending', 'processing') 
                      ORDER BY o.created_at DESC 
                      LIMIT 5");
$activeOrders = $stmt->fetchAll();

// Get low stock items for in-app notifications
$lowStockThreshold = 5;
$stmt = $pdo->prepare("SELECT mi.id, mi.name, mi.quantity, c.name as category_name
                      FROM menu_items mi
                      JOIN categories c ON mi.category_id = c.id
                      WHERE mi.is_available = 1 AND mi.quantity <= ?
                      ORDER BY mi.quantity ASC, mi.name ASC");
$stmt->execute([$lowStockThreshold]);
$lowStockItems = $stmt->fetchAll();
$lowStockCount = count($lowStockItems);

// Recommend high-value items using weighted recent sales + stock sanity.
$stmt = $pdo->query("SELECT rec.id, rec.name, rec.description, rec.price, rec.image_url, rec.temperature, rec.quantity,
                    rec.category_name, rec.sold_30_days
                    FROM (
                        SELECT mi.id, mi.name, mi.description, mi.price, mi.image_url, mi.temperature, mi.quantity,
                               c.name AS category_name,
                               COALESCE(SUM(CASE
                                   WHEN o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                                   AND o.status IN ('processing', 'completed')
                                   THEN oi.quantity ELSE 0 END), 0) AS sold_30_days,
                               COALESCE(SUM(CASE
                                   WHEN o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                                   AND o.status IN ('processing', 'completed')
                                   THEN oi.quantity ELSE 0 END), 0) AS sold_7_days,
                               (
                                   (COALESCE(SUM(CASE
                                       WHEN o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                                       AND o.status IN ('processing', 'completed')
                                       THEN oi.quantity ELSE 0 END), 0) * 0.55) +
                                   (COALESCE(SUM(CASE
                                       WHEN o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                                       AND o.status IN ('processing', 'completed')
                                       THEN oi.quantity ELSE 0 END), 0) * 0.35) +
                                   (LEAST(mi.quantity, 20) * 0.10)
                               ) AS recommendation_score
                        FROM menu_items mi
                        JOIN categories c ON mi.category_id = c.id
                        LEFT JOIN order_items oi ON oi.menu_item_id = mi.id
                        LEFT JOIN orders o ON o.id = oi.order_id
                        WHERE mi.is_available = 1
                          AND mi.quantity > {$lowStockThreshold}
                          AND c.name <> 'Drink Add-ons'
                          AND mi.name <> 'Bottled Water'
                        GROUP BY mi.id, mi.name, mi.description, mi.price, mi.image_url, mi.temperature, mi.quantity, c.name
                    ) rec
                    ORDER BY rec.recommendation_score DESC, rec.sold_7_days DESC, rec.name ASC
                    LIMIT 3");
$recommendedItems = $stmt->fetchAll();

$timeMenuItems = [];
$timeMenuItemNames = array_values(array_filter($activeTimeMenu['item_names'] ?? []));
if (!empty($timeMenuItemNames)) {
    $placeholders = implode(',', array_fill(0, count($timeMenuItemNames), '?'));
    $stmt = $pdo->prepare("SELECT mi.*, c.name as category_name, c.icon as category_icon
                          FROM menu_items mi
                          JOIN categories c ON mi.category_id = c.id
                          WHERE mi.is_available = 1 AND mi.name IN ($placeholders)");
    $stmt->execute($timeMenuItemNames);
    $timeMenuRows = $stmt->fetchAll();
    $itemsByName = [];
    foreach ($timeMenuRows as $row) {
        $itemsByName[$row['name']] = $row;
    }
    foreach ($timeMenuItemNames as $name) {
        if (isset($itemsByName[$name])) {
            $timeMenuItems[] = $itemsByName[$name];
        }
    }
}

// Initialize cart if not exists
if (!isset($_SESSION['cart'])) {
    $_SESSION['cart'] = [];
}

// Handle cart actions
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    requireCsrfToken();
    $action = $_POST['action'];
    
    if ($action === 'add_to_cart') {
        $itemId = (int)$_POST['item_id'];
        $quantity = (int)$_POST['quantity'];
        
        // Get current stock
        $stmt = $pdo->prepare("SELECT id, name, price, image_url, quantity FROM menu_items WHERE id = ?");
        $stmt->execute([$itemId]);
        $item = $stmt->fetch();
        
        if ($item) {
            // Check if enough stock available
            if ($item['quantity'] <= 0) {
                $_SESSION['error'] = htmlspecialchars($item['name']) . " is out of stock.";
            } elseif ($quantity <= 0) {
                $_SESSION['error'] = "Invalid quantity for " . htmlspecialchars($item['name']) . ".";
            } elseif ($quantity > $item['quantity']) {
                // Not enough stock
                $_SESSION['error'] = "Not enough stock for " . htmlspecialchars($item['name']) . ". Available: " . $item['quantity'] . ", Requested: " . $quantity;
            } else {
                // Enough stock, add to cart and reduce stock
                if (isset($_SESSION['cart'][$itemId])) {
                    $_SESSION['cart'][$itemId]['quantity'] += $quantity;
                } else {
                    $_SESSION['cart'][$itemId] = [
                        'id' => $item['id'],
                        'name' => $item['name'],
                        'price' => $item['price'],
                        'image_url' => $item['image_url'],
                        'quantity' => $quantity
                    ];
                }
                
                // Reduce stock immediately
                $stmt = $pdo->prepare("UPDATE menu_items SET quantity = quantity - ? WHERE id = ? AND quantity >= ?");
                $stmt->execute([$quantity, $itemId, $quantity]);
            }
        }
    } elseif ($action === 'update_quantity') {
        $itemId = (int)$_POST['item_id'];
        $quantity = (int)$_POST['quantity'];
        
        if (isset($_SESSION['cart'][$itemId])) {
            $currentCartQuantity = $_SESSION['cart'][$itemId]['quantity'];
            
            if ($quantity <= 0) {
                // Return stock when removing from cart
                $stmt = $pdo->prepare("UPDATE menu_items SET quantity = quantity + ? WHERE id = ?");
                $stmt->execute([$currentCartQuantity, $itemId]);
                unset($_SESSION['cart'][$itemId]);
            } else {
                $quantityDiff = $quantity - $currentCartQuantity;
                
                if ($quantityDiff > 0) {
                    // Increasing quantity - check if enough stock available
                    $stmt = $pdo->prepare("SELECT quantity FROM menu_items WHERE id = ?");
                    $stmt->execute([$itemId]);
                    $availableStock = $stmt->fetchColumn();
                    
                    if ($quantityDiff > $availableStock) {
                        $_SESSION['error'] = "Not enough stock. Available: " . $availableStock . ", Requested additional: " . $quantityDiff;
                    } else {
                        // Reduce additional stock
                        $stmt = $pdo->prepare("UPDATE menu_items SET quantity = quantity - ? WHERE id = ?");
                        $stmt->execute([$quantityDiff, $itemId]);
                        $_SESSION['cart'][$itemId]['quantity'] = $quantity;
                    }
                } else {
                    // Decreasing quantity - return difference to stock
                    $stmt = $pdo->prepare("UPDATE menu_items SET quantity = quantity + ? WHERE id = ?");
                    $stmt->execute([abs($quantityDiff), $itemId]);
                    $_SESSION['cart'][$itemId]['quantity'] = $quantity;
                }
            }
        }
    } elseif ($action === 'remove_from_cart') {
        $itemId = (int)$_POST['item_id'];
        
        // Return stock to inventory
        if (isset($_SESSION['cart'][$itemId])) {
            $cartQuantity = $_SESSION['cart'][$itemId]['quantity'];
            $stmt = $pdo->prepare("UPDATE menu_items SET quantity = quantity + ? WHERE id = ?");
            $stmt->execute([$cartQuantity, $itemId]);
            unset($_SESSION['cart'][$itemId]);
        }
    } elseif ($action === 'clear_cart') {
        // Return all stock to inventory
        foreach ($_SESSION['cart'] as $itemId => $item) {
            $stmt = $pdo->prepare("UPDATE menu_items SET quantity = quantity + ? WHERE id = ?");
            $stmt->execute([$item['quantity'], $itemId]);
        }
        $_SESSION['cart'] = [];
    } elseif ($action === 'clear_cart_no_return') {
        // Clear cart without returning stock (for confirmed orders)
        $_SESSION['cart'] = [];
    }
    
    redirect('menu.php?type=' . urlencode($menuType) . '&category=' . $selectedCategoryId);
}

// Calculate cart totals
$subtotal = 0;
$taxRate = getSetting('tax_rate') ? (float)getSetting('tax_rate') : 12;
foreach ($_SESSION['cart'] as $item) {
    $subtotal += $item['price'] * $item['quantity'];
}
$taxAmount = $subtotal * ($taxRate / 100);
$totalAmount = $subtotal + $taxAmount;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yellow Hauz POS Dashboard</title>
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
    </style>
</head>
<body class="bg-[#EAE8E3] h-screen w-screen p-3 font-sans text-brand-black overflow-hidden">

    <div class="bg-vintage-paper w-full h-full rounded-2xl shadow-2xl flex overflow-hidden border border-gray-300">
        
        
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
                    <a href="menu.php" class="flex items-center gap-4 bg-brand-black text-brand px-4 py-3.5 rounded-2xl font-semibold shadow-md transition-all">
                        <i class="fa-solid fa-mug-hot w-5 text-center"></i> <span class="nav-text">Menu</span>
                    </a>
                    <a href="table.php" class="flex items-center gap-4 text-gray-500 hover:text-brand-black hover:bg-gray-100 px-4 py-3.5 rounded-2xl font-medium transition-all">
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

        <main class="flex-1 flex flex-col relative bg-vintage-paper">
            <!-- Top Header -->
            <header class="h-[76px] flex items-center justify-between px-5 shrink-0">
                <button id="sidebarToggle" class="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-500 hover:text-brand-black">
                    <i class="fa-solid fa-bars"></i>
                </button>

                <form method="GET" action="menu.php" class="flex-1 max-w-2xl mx-6 relative">
                    <input type="hidden" name="type" value="<?php echo htmlspecialchars($menuType); ?>">
                    <i class="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input type="text" name="search" value="<?php echo htmlspecialchars($searchTerm); ?>" placeholder="Search coffee, pastries, etc..." class="w-full bg-white h-12 rounded-full pl-12 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-brand shadow-sm border border-gray-200">
                    <?php if ($searchTerm !== ''): ?>
                    <a href="menu.php?type=<?php echo htmlspecialchars($menuType); ?>&category=<?php echo (int)$selectedCategoryId; ?>" class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-black transition-colors">
                        <i class="fa-solid fa-xmark"></i>
                    </a>
                    <?php endif; ?>
                </form>

                <?php if (!empty($recommendedItems)): ?>
                <div class="hidden xl:flex items-center gap-2 max-w-[420px] overflow-hidden mr-4">
                    <button type="button" onclick="showRecommendationsModal()" class="shrink-0 w-10 h-10 rounded-xl bg-brand-light text-brand-black border border-brand flex items-center justify-center hover:bg-brand hover:shadow-sm transition-colors" title="View recommendations">
                        <i class="fa-solid fa-lightbulb"></i>
                    </button>
                    <div class="flex items-center gap-2 overflow-hidden">
                        <?php foreach ($recommendedItems as $recommendedItem): ?>
                        <button type="button" onclick="addToCart(<?php echo (int)$recommendedItem['id']; ?>)" class="shrink-0 max-w-[130px] bg-white h-10 rounded-xl px-3 border border-gray-200 shadow-sm hover:border-brand hover:bg-brand-light transition-colors text-left" title="Recommend <?php echo htmlspecialchars($recommendedItem['name']); ?>">
                            <span class="block text-xs font-bold text-brand-black truncate"><?php echo htmlspecialchars($recommendedItem['name']); ?></span>
                            <span class="block text-[10px] text-gray-500 truncate"><?php echo (int)$recommendedItem['quantity']; ?> stock &middot; <?php echo (int)$recommendedItem['sold_30_days']; ?> sold</span>
                        </button>
                        <?php endforeach; ?>
                    </div>
                </div>
                <?php endif; ?>

                <button onclick="showStockNotificationModal()" class="relative w-10 h-10 bg-white rounded-xl shadow-sm border <?php echo $lowStockCount > 0 ? 'border-red-200 text-red-600' : 'border-gray-200 text-gray-500'; ?> flex items-center justify-center hover:text-brand-black transition-colors" title="Stock notifications">
                    <i class="fa-solid fa-bell"></i>
                    <?php if ($lowStockCount > 0): ?>
                    <span class="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-vintage-paper">
                        <?php echo $lowStockCount; ?>
                    </span>
                    <?php endif; ?>
                </button>
            </header>

            <div class="flex-1 overflow-y-auto px-5 pb-32 pt-3 flex flex-row-reverse gap-2">
                <!-- Categories Sidebar -->
                <div class="grid grid-cols-1 content-start gap-1.5 shrink-0 w-[152px]">
                    <div class="bg-white border border-gray-200 rounded-2xl p-1.5 shadow-sm grid grid-cols-2 gap-1">
                        <button type="button" onclick="selectMenuType('drinks')" class="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-xs font-bold <?php echo $menuType === 'drinks' ? 'bg-brand text-brand-black' : 'text-gray-500 hover:bg-gray-50 hover:text-brand-black'; ?> transition-colors">
                            <i class="fa-solid fa-mug-saucer"></i>
                            Drinks
                        </button>
                        <button type="button" onclick="selectMenuType('food')" class="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-xs font-bold <?php echo $menuType === 'food' ? 'bg-brand text-brand-black' : 'text-gray-500 hover:bg-gray-50 hover:text-brand-black'; ?> transition-colors">
                            <i class="fa-solid fa-utensils"></i>
                            Food
                        </button>
                    </div>
                    <?php foreach ($visibleCategories as $category): ?>
                    <div class="w-full h-[44px] <?php echo $category['id'] == $selectedCategoryId ? 'bg-brand text-brand-black' : 'bg-white'; ?> rounded-xl flex items-center justify-start gap-1 px-1.5 cursor-pointer shadow-sm border <?php echo $category['id'] == $selectedCategoryId ? 'border-brand-black/40' : 'border-gray-400 hover:border-brand-black'; ?> transition-all" onclick="selectCategory(<?php echo $category['id']; ?>)">
                        <div class="w-7 h-7 flex items-center justify-center text-sm"><i class="<?php echo htmlspecialchars($category['icon']); ?>"></i></div>
                        <span class="font-bold text-[11px] leading-tight"><?php echo htmlspecialchars($category['name']); ?></span>
                    </div>
                    <?php endforeach; ?>
                </div>

                <!-- Product Grid -->
                <div class="flex-1 grid grid-cols-1 md:grid-cols-2 <?php echo $useXLargeItemCards ? 'lg:grid-cols-2 xl:grid-cols-2' : 'lg:grid-cols-3 xl:grid-cols-3'; ?> <?php echo $useXLargeItemCards ? 'gap-4' : ($useLargeItemCards ? 'gap-3' : 'gap-2'); ?> items-start">
                    <?php if (empty($menuItems)): ?>
                    <div class="col-span-full flex flex-col items-center justify-center text-center py-16 text-gray-400">
                        <i class="fa-solid fa-magnifying-glass text-4xl mb-3"></i>
                        <p class="text-sm font-bold text-gray-500">No menu items found</p>
                        <?php if ($searchTerm !== ''): ?>
                        <p class="text-xs mt-1">Try a different search term.</p>
                        <?php endif; ?>
                    </div>
                    <?php endif; ?>

                    <?php foreach ($menuItems as $item): ?>
                    <?php $isOutOfStock = (int)($item['quantity'] ?? 0) <= 0; ?>
                    <div class="bg-white <?php echo $useXLargeItemCards ? 'p-3 gap-2.5' : ($useLargeItemCards ? 'p-2.5 gap-2' : 'p-1.5 gap-1'); ?> rounded-xl shadow-sm border <?php echo $isOutOfStock ? 'border-red-100 opacity-60 cursor-not-allowed' : 'border-gray-500 hover:shadow-md cursor-pointer hover:border-brand-black'; ?> flex items-stretch self-start transition-all group" <?php if (!$isOutOfStock): ?>onclick="addToCart(<?php echo $item['id']; ?>)"<?php endif; ?>>
                        <div class="relative <?php echo $useXLargeItemCards ? 'w-[108px] h-[108px]' : ($useLargeItemCards ? 'w-[92px] h-[92px]' : 'w-[70px] h-[70px]'); ?> shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-100">
                            <?php if ($item['is_best_seller']): ?>
                            <span class="absolute top-1 left-1 bg-brand text-brand-black text-[8px] font-bold px-1.5 py-0.5 rounded z-10 uppercase tracking-wide border border-brand-black">Best</span>
                            <?php endif; ?>
                            <?php if ($isOutOfStock): ?>
                            <span class="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-md z-10 uppercase tracking-wide">Out of Stock</span>
                            <?php endif; ?>
                            <img src="<?php echo htmlspecialchars($item['image_url']); ?>" alt="<?php echo htmlspecialchars($item['name']); ?>" class="w-full h-full object-cover <?php echo $isOutOfStock ? 'grayscale' : 'group-hover:scale-105'; ?> transition-transform duration-500">
                        </div>
                        <div class="min-w-0 flex-1 flex flex-col justify-between py-0">
                            <h3 class="font-bold leading-tight font-serif <?php echo $useXLargeItemCards ? 'text-lg' : ($useLargeItemCards ? 'text-base' : 'text-sm'); ?> break-words"><?php echo htmlspecialchars($item['name']); ?></h3>
                            <div class="flex items-start mt-0.5">
                                <div class="flex flex-col leading-tight">
                                    <span class="font-bold <?php echo $useXLargeItemCards ? 'text-lg' : ($useLargeItemCards ? 'text-base' : 'text-sm'); ?> text-brand-black"><?php echo formatCurrency($item['price']); ?></span>
                                    <div class="flex items-center gap-1">
                                        <span class="text-xs <?php echo $isOutOfStock ? 'text-red-600 font-bold' : 'text-gray-500'; ?>">Qty: <?php echo $item['quantity'] ?? 0; ?></span>
                                        <span class="text-[9px] text-gray-700 font-bold tracking-wider uppercase border border-gray-200 px-1 py-0.5 rounded bg-gray-50"><?php echo strtoupper($item['temperature']); ?></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>

                <!-- Time-Based Featured Items -->
                <aside id="timeMenuPanel" class="hidden xl:block w-[170px] shrink-0 transition-all duration-300 ease-in-out">
                    <div class="sticky top-0 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                        <button type="button" id="timeMenuToggle" class="w-full px-3 py-3 border-b border-gray-100 bg-brand-light flex items-center justify-between gap-2 text-left hover:bg-brand/70 transition-colors" aria-label="Toggle time-based menu">
                            <div id="timeMenuHeaderText" class="min-w-0">
                                <p class="text-[10px] font-bold uppercase tracking-wider text-brand-dark"><?php echo htmlspecialchars($activeTimeMenu['time'] ?? 'Now'); ?></p>
                                <h3 class="font-serif text-lg font-bold text-brand-black leading-tight truncate"><?php echo htmlspecialchars($activeTimeMenu['title'] ?? 'Featured Now'); ?></h3>
                            </div>
                            <span id="timeMenuCollapsedIcon" class="hidden w-6 h-6 rounded-md border border-gray-200 bg-white text-gray-600 items-center justify-center shrink-0">
                                <i class="fa-solid fa-chevron-left text-[10px]"></i>
                            </span>
                        </button>
                        <div id="timeMenuContent" class="max-h-[calc(100vh-220px)] overflow-y-auto p-2.5 space-y-2.5">
                            <?php if (empty($timeMenuItems)): ?>
                            <div class="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center text-gray-400">
                                <i class="fa-solid fa-clock text-2xl mb-2"></i>
                                <p class="text-xs font-bold text-gray-500">No featured items found</p>
                            </div>
                            <?php endif; ?>
                            <?php foreach ($timeMenuItems as $timeItem): ?>
                            <?php $isTimeItemOutOfStock = (int)($timeItem['quantity'] ?? 0) <= 0; ?>
                            <button type="button" class="w-full text-left rounded-xl border <?php echo $isTimeItemOutOfStock ? 'border-red-100 bg-red-50 opacity-60 cursor-not-allowed' : 'border-gray-200 bg-gray-50 hover:border-brand hover:bg-brand-light'; ?> px-2.5 py-2 transition-colors" <?php if (!$isTimeItemOutOfStock): ?>onclick="addToCart(<?php echo (int)$timeItem['id']; ?>)"<?php endif; ?>>
                                <div class="min-w-0">
                                    <h4 class="font-serif font-bold text-xs leading-tight text-brand-black truncate"><?php echo htmlspecialchars($timeItem['name']); ?></h4>
                                    <p class="text-[10px] text-gray-500 mt-0.5 truncate"><?php echo htmlspecialchars($timeItem['category_name']); ?></p>
                                    <div class="flex items-center justify-between gap-2 mt-1.5">
                                        <span class="font-bold text-[11px] text-brand-black"><?php echo formatCurrency($timeItem['price']); ?></span>
                                        <span class="text-[10px] <?php echo $isTimeItemOutOfStock ? 'text-red-600 font-bold' : 'text-gray-500'; ?>">
                                            <?php echo $isTimeItemOutOfStock ? 'Out' : 'Qty ' . (int)$timeItem['quantity']; ?>
                                        </span>
                                    </div>
                                </div>
                            </button>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </aside>
            </div>

            <!-- Bottom Active Tickets Bar -->
            <div class="absolute bottom-6 left-5 right-5 flex gap-3">
                <?php foreach ($activeOrders as $order): ?>
                <div class="<?php echo $order['status'] == 'processing' ? 'bg-brand-black text-white border-2 border-brand' : 'bg-white'; ?> rounded-full pl-2 <?php echo $order['status'] == 'processing' ? 'pr-4' : 'pr-6'; ?> py-2 flex items-center gap-3 shadow-lg border border-gray-200 cursor-pointer">
                    <div class="w-10 h-10 rounded-full <?php echo $order['status'] == 'processing' ? 'bg-brand text-brand-black' : 'bg-brand text-brand-black border border-brand-black'; ?> font-bold flex items-center justify-center">T<?php echo $order['table_number'] ?? 'TA'; ?></div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h4 class="text-sm font-bold leading-tight"><?php echo htmlspecialchars(substr($order['customer_name'] ?? 'Guest', 0, 10)); ?><?php echo strlen($order['customer_name'] ?? '') > 10 ? '...' : ''; ?></h4>
                            <?php if ($order['status'] == 'processing'): ?>
                            <span class="bg-white/20 text-[10px] px-1.5 py-0.5 rounded text-white border border-white/10 uppercase tracking-wider">Process</span>
                            <?php endif; ?>
                        </div>
                        <p class="text-xs <?php echo $order['status'] == 'processing' ? 'text-gray-300' : 'text-gray-400'; ?>"><?php echo $order['id']; ?> items &rarr; Bar</p>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
        </main>

        <!-- RIGHT ORDER PANEL -->
        <aside class="w-[360px] bg-white border-l border-vintage-border flex flex-col shrink-0 z-10 shadow-[-10px_0_20px_rgba(0,0,0,0.02)]">
            
            <!-- Panel Header -->
            <div class="p-4 pb-1">
                <div class="flex items-start justify-between gap-3 mb-3">
                    <div class="min-w-0 flex-1">
                        <button onclick="showTableSelectModal()" class="group inline-flex max-w-full items-center gap-1.5 text-left">
                            <h2 id="selectedTableLabel" class="min-w-0 truncate text-xl font-serif font-bold group-hover:text-brand-dark transition-colors">Select Table</h2>
                            <i class="fa-solid fa-pen text-xs text-gray-400 group-hover:text-brand-dark transition-colors shrink-0"></i>
                        </button>
                        <p class="text-xs text-gray-500 font-medium mt-1"><?php echo htmlspecialchars($currentUser['full_name']); ?></p>
                    </div>
                    <div class="flex flex-col items-end gap-1.5 shrink-0">
                        <?php if (!empty($_SESSION['cart'])): ?>
                        <button onclick="showClearCartModal()" class="bg-red-50 text-red-600 border border-red-200 px-2.5 py-1.5 rounded-lg font-bold text-xs hover:bg-red-600 hover:text-white transition-colors flex items-center justify-center gap-1.5">
                            <i class="fa-solid fa-trash-can"></i>
                            Clear All
                        </button>
                        <?php endif; ?>
                        <!-- Order Type Switch -->
                        <div class="bg-gray-100 p-1 rounded-lg flex items-center text-sm font-semibold border border-gray-200">
                            <button id="dineInBtn" onclick="setOrderType('dinein')" class="px-3 py-1.5 rounded-md bg-white text-brand-black font-bold shadow-sm border border-gray-300 transition-all">
                                <i class="fa-solid fa-utensils mr-1"></i>
                                Dine In
                            </button>
                            <button id="takeAwayBtn" onclick="setOrderType('takeaway')" class="px-3 py-1.5 rounded-md text-gray-500 hover:text-brand-black font-semibold transition-all">
                                <i class="fa-solid fa-bag-shopping mr-1"></i>
                                Take Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto px-4 pb-4 pt-0 space-y-2">
                <?php if (isset($_SESSION['error'])): ?>
                <div class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-4">
                    <div class="flex items-center gap-3">
                        <i class="fa-solid fa-exclamation-triangle"></i>
                        <span class="font-medium"><?php echo htmlspecialchars($_SESSION['error']); ?></span>
                    </div>
                </div>
                <?php unset($_SESSION['error']); ?>
                <?php else: ?>
                <?php if (empty($_SESSION['cart'])): ?>
                <div class="text-center py-8 text-gray-400">
                    <i class="fa-solid fa-cart-shopping text-4xl mb-3"></i>
                    <p class="text-sm font-medium">No items in cart</p>
                </div>
                <?php else: ?>
                <?php foreach ($_SESSION['cart'] as $item): ?>
                <div class="flex gap-1.5 border border-gray-200 px-2.5 py-1.5 rounded-xl shadow-sm bg-white">
                    <div class="flex-1 min-w-0 flex flex-col justify-between">
                        <h4 class="text-sm font-serif font-bold leading-tight"><?php echo htmlspecialchars($item['name']); ?></h4>
                        <div class="flex justify-between items-center mt-1">
                            <span class="text-gray-500 text-xs"><?php echo formatCurrency($item['price']); ?></span>
                            <div class="flex items-center gap-1">
                                <button onclick="updateQuantity(<?php echo $item['id']; ?>, <?php echo $item['quantity']; ?> - 1)" class="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 flex items-center justify-center transition-colors">
                                    <i class="fa-solid fa-minus text-xs"></i>
                                </button>
                                <span class="text-xs font-bold px-2 py-0.5 bg-gray-100 rounded border border-gray-200 min-w-[30px] text-center"><?php echo $item['quantity']; ?></span>
                                <button onclick="updateQuantity(<?php echo $item['id']; ?>, <?php echo $item['quantity']; ?> + 1)" class="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 flex items-center justify-center transition-colors">
                                    <i class="fa-solid fa-plus text-xs"></i>
                                </button>
                            </div>
                            <span class="font-bold text-sm"><?php echo formatCurrency($item['price'] * $item['quantity']); ?></span>
                        </div>
                    </div>
                    <button class="text-gray-400 hover:text-red-500 transition-colors ml-2" onclick="removeFromCart(<?php echo $item['id']; ?>)">
                        <i class="fa-solid fa-trash text-sm"></i>
                    </button>
                </div>
                <?php endforeach; ?>
                <?php endif; ?>
                <?php endif; ?>
            </div>

            <!-- Totals & Payment Checkout -->
            <div class="p-4 bg-vintage-paper border-t border-gray-200 shrink-0">
                <div class="flex justify-between items-center mb-4">
                    <span class="font-bold text-base font-serif">Total Amount</span>
                    <span id="panelTotalAmount" class="font-bold text-xl text-brand-black"><?php echo formatCurrency($totalAmount); ?></span>
                </div>

                <div class="grid grid-cols-[1fr_auto] gap-2 mb-3">
                    <button onclick="showAmountReceivedModal()" class="bg-white text-brand-black py-2.5 rounded-xl font-bold text-sm hover:bg-gray-100 transition-colors border border-gray-300 flex flex-col items-center justify-center gap-0.5">
                        <span class="flex items-center gap-2"><i class="fa-solid fa-money-bill-transfer"></i>Amount Given</span>
                        <span id="amountGivenButtonLabel" class="text-[10px] font-bold text-gray-500 leading-none"><?php echo formatCurrency(0); ?></span>
                    </button>
                    <div class="bg-white border border-gray-200 rounded-xl px-3 py-2 min-w-[105px] text-right">
                        <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Change</p>
                        <p id="panelChangeAmount" class="text-sm font-bold text-brand-black"><?php echo formatCurrency(0); ?></p>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="grid grid-cols-3 gap-2">
                    <div class="relative">
                        <button onclick="togglePaymentDropup()" class="w-full bg-brand-black text-brand py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors border border-transparent flex flex-col items-center justify-center gap-0.5">
                            <span class="flex items-center gap-2"><i class="fa-solid fa-credit-card"></i>Payment</span>
                            <span id="paymentButtonLabel" class="text-[10px] font-bold text-brand/80 leading-none">Cash</span>
                        </button>
                        <div id="paymentDropup" class="hidden absolute bottom-[calc(100%+0.5rem)] left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-2xl p-2 z-30">
                            <button type="button" onclick="selectPaymentMethod('cash', 'Cash'); hidePaymentDropup();" class="payment-option w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left border-2 border-brand-black bg-brand text-brand-black shadow-[2px_2px_0px_0px_rgba(23,23,23,1)] transition-transform active:translate-y-0.5 active:shadow-none" data-payment-method="cash">
                                <span class="flex items-center gap-2 text-sm font-bold"><i class="fa-solid fa-money-bill-wave"></i>Cash</span>
                                <i class="payment-check fa-solid fa-check text-brand-black"></i>
                            </button>
                            <button type="button" onclick="selectPaymentMethod('card', 'Card'); hidePaymentDropup();" class="payment-option w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left border border-gray-200 bg-white hover:bg-gray-50 mt-2 transition-colors" data-payment-method="card">
                                <span class="flex items-center gap-2 text-sm font-bold text-gray-600"><i class="fa-regular fa-credit-card"></i>Card</span>
                                <i class="payment-check fa-solid fa-check text-brand-black hidden"></i>
                            </button>
                            <button type="button" onclick="selectPaymentMethod('gcash', 'GCash'); hidePaymentDropup();" class="payment-option w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left border border-gray-200 bg-white hover:bg-gray-50 mt-2 transition-colors" data-payment-method="gcash">
                                <span class="flex items-center gap-2 text-sm font-bold text-gray-600"><i class="fa-solid fa-mobile-screen"></i>GCash</span>
                                <i class="payment-check fa-solid fa-check text-brand-black hidden"></i>
                            </button>
                        </div>
                    </div>
                    <button onclick="showCouponModal()" class="bg-gray-100 text-brand-black py-2.5 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors border border-gray-300 flex flex-col items-center justify-center gap-0.5">
                        <span class="flex items-center gap-2"><i class="fa-solid fa-ticket"></i>Coupon</span>
                        <span id="couponButtonLabel" class="text-[10px] font-bold text-gray-500 leading-none">None</span>
                    </button>
                    <button onclick="showBillModal()" class="bg-brand-black text-brand py-3 rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors border border-transparent flex items-center justify-center gap-2">
                        <i class="fa-solid fa-print"></i>
                        Print Bill
                    </button>
                </div>
            </div>
        </aside>

    </div>

    <!-- Clear Cart Confirmation Modal -->
    <div id="clearCartModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 hidden">
        <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200">
            <div class="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
                <i class="fa-solid fa-trash-can text-red-600 text-2xl"></i>
            </div>
            <h3 class="text-xl font-serif font-bold text-brand-black text-center mb-2">Clear All Items?</h3>
            <p class="text-gray-600 text-center mb-6">This will remove every item from the order and return the quantities to stock.</p>
            <div class="flex gap-3">
                <button onclick="hideClearCartModal()" class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                    Cancel
                </button>
                <button onclick="clearCart()" class="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors">
                    Clear All
                </button>
            </div>
        </div>
    </div>

    <!-- Stock Notification Modal -->
    <div id="stockNotificationModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 hidden">
        <div class="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl border border-gray-200 max-h-[80vh] overflow-hidden flex flex-col">
            <div class="flex items-center justify-between mb-5">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-full <?php echo $lowStockCount > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'; ?> flex items-center justify-center">
                        <i class="fa-solid <?php echo $lowStockCount > 0 ? 'fa-triangle-exclamation' : 'fa-check'; ?> text-xl"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-serif font-bold text-brand-black">Stock Notifications</h3>
                        <p class="text-xs text-gray-500"><?php echo $lowStockCount > 0 ? $lowStockCount . ' item(s) need restocking' : 'All items are stocked'; ?></p>
                    </div>
                </div>
                <button onclick="hideStockNotificationModal()" class="w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:text-brand-black hover:bg-gray-200 transition-colors">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div class="flex-1 overflow-y-auto space-y-3 pr-1">
                <?php if ($lowStockCount > 0): ?>
                    <?php foreach ($lowStockItems as $stockItem): ?>
                    <div class="flex items-center justify-between p-4 rounded-xl border <?php echo (int)$stockItem['quantity'] === 0 ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'; ?>">
                        <div>
                            <p class="font-bold text-brand-black"><?php echo htmlspecialchars($stockItem['name']); ?></p>
                            <p class="text-xs text-gray-500 mt-1"><?php echo htmlspecialchars($stockItem['category_name']); ?></p>
                        </div>
                        <div class="text-right">
                            <p class="text-lg font-bold <?php echo (int)$stockItem['quantity'] === 0 ? 'text-red-600' : 'text-yellow-700'; ?>">
                                <?php echo (int)$stockItem['quantity']; ?>
                            </p>
                            <p class="text-[10px] uppercase tracking-wider font-bold <?php echo (int)$stockItem['quantity'] === 0 ? 'text-red-600' : 'text-yellow-700'; ?>">
                                <?php echo (int)$stockItem['quantity'] === 0 ? 'Out of stock' : 'Low stock'; ?>
                            </p>
                        </div>
                    </div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <div class="text-center py-10 text-gray-400">
                        <i class="fa-solid fa-boxes-stacked text-4xl mb-3"></i>
                        <p class="text-sm font-medium">No low stock items</p>
                    </div>
                <?php endif; ?>
            </div>

            <div class="pt-5 mt-5 border-t border-gray-100 flex gap-3">
                <a href="items.php" class="flex-1 bg-brand-black text-brand py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors text-center">
                    Manage Stock
                </a>
                <button onclick="hideStockNotificationModal()" class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                    Close
                </button>
            </div>
        </div>
    </div>

    <?php if (!empty($recommendedItems)): ?>
    <!-- Recommendations Modal -->
    <div id="recommendationsModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 hidden">
        <div class="bg-white rounded-2xl max-w-4xl w-full mx-4 shadow-2xl border border-gray-200 max-h-[90vh] overflow-hidden flex flex-col">
            <div class="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-xl bg-brand-light text-brand-black border border-brand flex items-center justify-center">
                        <i class="fa-solid fa-lightbulb text-xl"></i>
                    </div>
                    <div>
                        <h3 class="text-2xl font-serif font-bold text-brand-black">Recommended Items</h3>
                        <p class="text-xs text-gray-500 mt-1">Slow-moving items with healthy stock, ready to suggest at checkout</p>
                    </div>
                </div>
                <button onclick="hideRecommendationsModal()" class="w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:text-brand-black hover:bg-gray-200 transition-colors shrink-0">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div class="p-6 overflow-y-auto">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <?php foreach ($recommendedItems as $recommendedItem): ?>
                    <div class="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col">
                        <div class="h-48 bg-gray-100 overflow-hidden">
                            <img src="<?php echo htmlspecialchars($recommendedItem['image_url']); ?>" alt="<?php echo htmlspecialchars($recommendedItem['name']); ?>" class="w-full h-full object-cover">
                        </div>
                        <div class="p-4 flex flex-col flex-1">
                            <div class="flex items-start justify-between gap-3 mb-2">
                                <div>
                                    <p class="text-xs text-gray-500 font-bold uppercase tracking-wider"><?php echo htmlspecialchars($recommendedItem['category_name']); ?></p>
                                    <h4 class="font-serif text-xl font-bold text-brand-black leading-tight mt-1"><?php echo htmlspecialchars($recommendedItem['name']); ?></h4>
                                </div>
                                <span class="text-[10px] text-gray-600 font-bold tracking-wider uppercase border border-gray-200 px-2 py-1 rounded bg-gray-50 shrink-0">
                                    <?php echo strtoupper($recommendedItem['temperature']); ?>
                                </span>
                            </div>
                            <p class="text-sm text-gray-500 leading-relaxed mb-4 line-clamp-3">
                                <?php echo htmlspecialchars($recommendedItem['description'] ?: 'No description available.'); ?>
                            </p>
                            <div class="grid grid-cols-2 gap-3 mb-4 mt-auto">
                                <div class="bg-gray-50 rounded-xl border border-gray-200 p-3">
                                    <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Stock</p>
                                    <p class="font-bold text-brand-black mt-1"><?php echo (int)$recommendedItem['quantity']; ?></p>
                                </div>
                                <div class="bg-brand-light rounded-xl border border-brand/40 p-3">
                                    <p class="text-[10px] text-brand-dark font-bold uppercase tracking-wider">30 days</p>
                                    <p class="font-bold text-brand-black mt-1"><?php echo (int)$recommendedItem['sold_30_days']; ?> sold</p>
                                </div>
                            </div>
                            <button type="button" onclick="addToCart(<?php echo (int)$recommendedItem['id']; ?>)" class="w-full bg-brand-black text-brand py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                                <i class="fa-solid fa-cart-plus"></i>
                                Add <?php echo formatCurrency($recommendedItem['price']); ?>
                            </button>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>
    </div>
    <?php endif; ?>

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

    <!-- Bill Modal -->
    <div id="billModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 hidden">
        <div class="bg-white rounded-2xl max-w-lg w-full mx-4 shadow-2xl border border-gray-200 max-h-[92vh] overflow-y-auto">
            <!-- Bill Header -->
            <div class="p-6 border-b border-gray-100">
                <div class="text-center mb-4">
                    <h3 class="text-3xl font-serif font-bold text-brand-black mb-2">Coffee at Yellow Hauz</h3>
                    <p class="text-sm text-gray-500">Yellow Hauz, Philippines</p>
                    <p class="text-sm text-gray-500">+63 912 345 6789</p>
                </div>
                
                <div class="flex justify-between items-center mb-4">
                    <div>
                        <p id="billTableLabel" class="text-base font-bold text-brand-black">Select Table</p>
                        <p id="billOrderTypeLabel" class="text-sm text-gray-500">Dine In</p>
                    </div>
                    <div class="text-right">
                        <p class="text-sm text-gray-500">Order #<?php echo date('Ymd') . rand(100, 999); ?></p>
                        <p class="text-sm text-gray-500"><?php echo date('M d, Y h:i A'); ?></p>
                    </div>
                </div>
                
                <div class="text-center">
                    <p class="text-sm font-bold text-brand-black"><?php echo htmlspecialchars($currentUser['full_name']); ?></p>
                    <p id="billPaymentMethodLabel" class="text-xs text-gray-500 mt-1">Payment: Cash</p>
                    <p id="billDiscountHeader" class="text-xs text-gray-500 mt-1 hidden">Discount: None</p>
                </div>
            </div>

            <!-- Bill Items -->
            <div class="p-6">
                <div class="space-y-3 mb-6">
                    <?php if (!empty($_SESSION['cart'])): ?>
                        <?php foreach ($_SESSION['cart'] as $item): ?>
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <p class="text-base font-medium text-brand-black"><?php echo htmlspecialchars($item['name']); ?></p>
                                <p class="text-sm text-gray-500"><?php echo $item['quantity']; ?> × <?php echo formatCurrency($item['price']); ?></p>
                            </div>
                            <p class="text-base font-bold text-brand-black"><?php echo formatCurrency($item['price'] * $item['quantity']); ?></p>
                        </div>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <p class="text-center text-gray-400 text-sm">No items in cart</p>
                    <?php endif; ?>
                </div>

                <!-- Bill Summary -->
                <div class="border-t border-gray-200 pt-4 space-y-2">
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-600 font-medium">Subtotal</span>
                        <span id="billSubtotalAmount" class="font-bold"><?php echo formatCurrency($subtotal); ?></span>
                    </div>
                    <div id="billDiscountAmountRow" class="hidden justify-between text-sm">
                        <span class="text-gray-600 font-medium">Discount Amount</span>
                        <span id="billDiscountAmount" class="font-bold text-green-600">-<?php echo formatCurrency(0); ?></span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-600 font-medium">Tax (<?php echo $taxRate; ?>%)</span>
                        <span id="billTaxAmount" class="font-bold"><?php echo formatCurrency($taxAmount); ?></span>
                    </div>
                    <div id="billDiscountRow" class="hidden justify-between text-sm">
                        <span class="text-gray-600 font-medium">Discount</span>
                        <span id="billDiscountLabel" class="font-bold text-brand-black">None</span>
                    </div>
                    <div class="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                        <span class="text-brand-black">Total</span>
                        <span id="billTotalAmount" class="text-brand-black"><?php echo formatCurrency($totalAmount); ?></span>
                    </div>
                    <div class="flex justify-between text-sm pt-2 border-t border-gray-100">
                        <span class="text-gray-600 font-medium">Amount Given</span>
                        <span id="billAmountReceived" class="font-bold text-brand-black"><?php echo formatCurrency(0); ?></span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-600 font-medium">Change</span>
                        <span id="billChangeAmount" class="font-bold text-brand-black"><?php echo formatCurrency(0); ?></span>
                    </div>
                </div>
            </div>

            <!-- Bill Footer -->
            <div class="p-6 border-t border-gray-100 bg-gray-50">
                <p class="text-center text-xs text-gray-500 mb-4">Thank you for visiting Coffee at Yellow Hauz!</p>
                <div class="flex gap-3">
                    <button onclick="hideBillModal()" class="flex-1 bg-gray-100 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                        Close
                    </button>
                    <button onclick="printBill()" class="flex-1 bg-brand-black text-brand py-4 rounded-xl font-bold hover:bg-gray-800 transition-colors">
                        <i class="fa-solid fa-print mr-2"></i> Print
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Amount Received Modal -->
    <div id="amountReceivedModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 hidden">
        <div class="relative bg-white rounded-2xl p-7 max-w-4xl w-full mx-4 shadow-2xl border border-gray-200">
            <button type="button" onclick="hideAmountReceivedModal()" class="absolute top-4 right-4 w-11 h-11 rounded-full bg-gray-100 text-gray-500 hover:text-brand-black hover:bg-gray-200 transition-colors">
                <i class="fa-solid fa-xmark"></i>
            </button>
            <div class="flex items-center justify-center w-20 h-20 bg-brand-light rounded-full mx-auto mb-4">
                <i class="fa-solid fa-money-bill-transfer text-brand-dark text-3xl"></i>
            </div>
            <h3 class="text-2xl font-serif font-bold text-brand-black text-center mb-2">Amount Given</h3>
            <p class="text-gray-600 text-center mb-7">Enter the amount received from the customer</p>

            <div class="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-7 items-start">
                <div class="space-y-5">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Customer Amount</label>
                        <input id="amountReceivedInput" type="number" min="0" step="0.01" placeholder="0.00" oninput="updateAmountReceived()" class="w-full bg-white border border-gray-200 rounded-xl px-5 py-4 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-brand">
                    </div>

                    <div class="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-3">
                        <div class="flex justify-between text-base">
                            <span class="text-gray-600">Total Due</span>
                            <span id="amountModalTotal" class="font-bold text-brand-black"><?php echo formatCurrency($totalAmount); ?></span>
                        </div>
                        <div class="flex justify-between text-base">
                            <span class="text-gray-600">Change</span>
                            <span id="amountModalChange" class="font-bold text-brand-black"><?php echo formatCurrency(0); ?></span>
                        </div>
                    </div>

                    <div class="flex gap-3">
                        <button onclick="clearAmountReceived()" class="flex-1 bg-gray-100 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                            Clear
                        </button>
                        <button onclick="confirmAmountReceived()" class="flex-1 bg-brand-black text-brand py-4 rounded-xl font-bold hover:bg-gray-800 transition-colors">
                            Done
                        </button>
                    </div>
                </div>

                <div class="space-y-4">
                    <div class="grid grid-cols-3 gap-3">
                        <button type="button" onclick="setAmountReceivedPreset(1000)" class="bg-brand-light border border-brand rounded-xl py-4 text-lg font-bold text-brand-black hover:bg-brand transition-colors">1000</button>
                        <button type="button" onclick="setAmountReceivedPreset(500)" class="bg-brand-light border border-brand rounded-xl py-4 text-lg font-bold text-brand-black hover:bg-brand transition-colors">500</button>
                        <button type="button" onclick="setAmountReceivedPreset(200)" class="bg-brand-light border border-brand rounded-xl py-4 text-lg font-bold text-brand-black hover:bg-brand transition-colors">200</button>
                        <button type="button" onclick="setAmountReceivedPreset(100)" class="bg-brand-light border border-brand rounded-xl py-4 text-lg font-bold text-brand-black hover:bg-brand transition-colors">100</button>
                        <button type="button" onclick="setAmountReceivedPreset(50)" class="bg-brand-light border border-brand rounded-xl py-4 text-lg font-bold text-brand-black hover:bg-brand transition-colors">50</button>
                        <button type="button" onclick="setAmountReceivedPreset(20)" class="bg-brand-light border border-brand rounded-xl py-4 text-lg font-bold text-brand-black hover:bg-brand transition-colors">20</button>
                    </div>

                    <div class="grid grid-cols-3 gap-3">
                        <button type="button" onclick="pressAmountKey('7')" class="bg-white border border-gray-300 rounded-xl py-6 text-2xl font-bold hover:bg-gray-100 transition-colors">7</button>
                        <button type="button" onclick="pressAmountKey('8')" class="bg-white border border-gray-300 rounded-xl py-6 text-2xl font-bold hover:bg-gray-100 transition-colors">8</button>
                        <button type="button" onclick="pressAmountKey('9')" class="bg-white border border-gray-300 rounded-xl py-6 text-2xl font-bold hover:bg-gray-100 transition-colors">9</button>
                        <button type="button" onclick="pressAmountKey('4')" class="bg-white border border-gray-300 rounded-xl py-6 text-2xl font-bold hover:bg-gray-100 transition-colors">4</button>
                        <button type="button" onclick="pressAmountKey('5')" class="bg-white border border-gray-300 rounded-xl py-6 text-2xl font-bold hover:bg-gray-100 transition-colors">5</button>
                        <button type="button" onclick="pressAmountKey('6')" class="bg-white border border-gray-300 rounded-xl py-6 text-2xl font-bold hover:bg-gray-100 transition-colors">6</button>
                        <button type="button" onclick="pressAmountKey('1')" class="bg-white border border-gray-300 rounded-xl py-6 text-2xl font-bold hover:bg-gray-100 transition-colors">1</button>
                        <button type="button" onclick="pressAmountKey('2')" class="bg-white border border-gray-300 rounded-xl py-6 text-2xl font-bold hover:bg-gray-100 transition-colors">2</button>
                        <button type="button" onclick="pressAmountKey('3')" class="bg-white border border-gray-300 rounded-xl py-6 text-2xl font-bold hover:bg-gray-100 transition-colors">3</button>
                        <button type="button" onclick="backspaceAmountReceived()" class="bg-gray-100 border border-gray-300 rounded-xl py-6 text-2xl font-bold text-gray-700 hover:bg-gray-200 transition-colors">
                            <i class="fa-solid fa-delete-left"></i>
                        </button>
                        <button type="button" onclick="pressAmountKey('0')" class="bg-white border border-gray-300 rounded-xl py-6 text-2xl font-bold hover:bg-gray-100 transition-colors">0</button>
                        <button type="button" onclick="pressAmountKey('.')" class="bg-gray-100 border border-gray-300 rounded-xl py-6 text-2xl font-bold text-gray-700 hover:bg-gray-200 transition-colors">.</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Table Select Modal -->
    <div id="tableSelectModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 hidden">
        <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200">
            <div class="flex items-center justify-center w-16 h-16 bg-brand-light rounded-full mx-auto mb-4">
                <i class="fa-solid fa-utensils text-brand-dark text-2xl"></i>
            </div>
            <h3 class="text-xl font-serif font-bold text-brand-black text-center mb-2">Assign Table</h3>
            <p class="text-gray-600 text-center mb-6">Choose an available table for this order</p>
            
            <div class="grid grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
                <?php foreach ($availableTables as $table): ?>
                <button type="button" onclick="selectTable(<?php echo (int)$table['id']; ?>, '<?php echo htmlspecialchars('Table ' . $table['table_number'], ENT_QUOTES); ?>')" class="table-option border border-gray-200 rounded-xl p-4 text-left hover:border-brand hover:bg-brand-light transition-colors" data-table-id="<?php echo (int)$table['id']; ?>">
                    <span class="block font-serif font-bold text-lg text-brand-black">T<?php echo htmlspecialchars($table['table_number']); ?></span>
                    <span class="block text-xs text-gray-500 font-medium mt-1"><?php echo (int)$table['capacity']; ?> chairs</span>
                </button>
                <?php endforeach; ?>

                <?php if (empty($availableTables)): ?>
                <div class="col-span-2 text-center py-8 text-gray-400">
                    <i class="fa-solid fa-chair text-3xl mb-3"></i>
                    <p class="text-sm font-medium">No available tables</p>
                </div>
                <?php endif; ?>
            </div>
            
            <div class="flex gap-3 mt-6">
                <button onclick="clearSelectedTable()" class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                    No Table
                </button>
                <button onclick="hideTableSelectModal()" class="flex-1 bg-brand-black text-brand py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors">
                    Done
                </button>
            </div>
        </div>
    </div>

    <!-- Coupon Modal -->
    <div id="couponModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 hidden">
        <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200">
            <div class="flex items-center justify-center w-16 h-16 bg-brand-light rounded-full mx-auto mb-4">
                <i class="fa-solid fa-ticket text-brand-dark text-2xl"></i>
            </div>
            <h3 class="text-xl font-serif font-bold text-brand-black text-center mb-2">Select Discount</h3>
            <p class="text-gray-600 text-center mb-6">Choose the discount type for this order</p>
            
            <form class="space-y-4">
                <div class="space-y-3">
                    <button type="button" onclick="selectDiscount('Senior Citizen', 20)" class="discount-option w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl hover:border-brand-black hover:bg-brand-light transition-colors text-left">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-brand-light text-brand-dark flex items-center justify-center">
                                <i class="fa-solid fa-person-cane"></i>
                            </div>
                            <div>
                                <p class="font-bold text-brand-black">Senior Citizen</p>
                                <p class="text-xs text-gray-500">Apply senior citizen discount</p>
                            </div>
                        </div>
                        <i class="fa-solid fa-chevron-right text-gray-400"></i>
                    </button>

                    <button type="button" onclick="selectDiscount('PWD', 20)" class="discount-option w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl hover:border-brand-black hover:bg-brand-light transition-colors text-left">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-brand-light text-brand-dark flex items-center justify-center">
                                <i class="fa-solid fa-wheelchair"></i>
                            </div>
                            <div>
                                <p class="font-bold text-brand-black">PWD</p>
                                <p class="text-xs text-gray-500">Apply PWD discount</p>
                            </div>
                        </div>
                        <i class="fa-solid fa-chevron-right text-gray-400"></i>
                    </button>

                    <button type="button" onclick="showAddDiscountFields()" class="w-full flex items-center justify-between p-4 border border-dashed border-gray-300 rounded-xl hover:border-brand-black hover:bg-gray-50 transition-colors text-left">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                                <i class="fa-solid fa-plus"></i>
                            </div>
                            <div>
                                <p class="font-bold text-brand-black">Add New</p>
                                <p class="text-xs text-gray-500">Create a custom discount label</p>
                            </div>
                        </div>
                    </button>
                </div>

                <div id="addDiscountFields" class="hidden space-y-3">
                    <input id="customDiscountName" type="text" placeholder="Discount name" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                    <button type="button" onclick="selectCustomDiscount()" class="w-full bg-brand-light text-brand-dark py-3 rounded-xl font-bold hover:bg-brand hover:text-brand-black transition-colors">
                        Use Custom Discount
                    </button>
                </div>

                <div id="discountPercentFields" class="hidden">
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Discount Percentage</label>
                    <div class="relative">
                        <input id="discountPercentInput" type="number" min="0" max="100" step="1" value="20" oninput="updateDiscountPercent()" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                        <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">%</span>
                    </div>
                </div>
                
                <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div class="flex justify-between items-center text-sm">
                        <span class="text-gray-600">Selected Discount</span>
                        <span class="font-bold text-green-600">-₱0.00</span>
                    </div>
                </div>
                
                <div class="flex gap-3 pt-4">
                    <button type="button" onclick="clearDiscount()" class="flex-1 bg-white text-red-600 py-3 rounded-xl font-bold hover:bg-red-50 transition-colors border border-red-200">
                        Remove
                    </button>
                    <button type="button" onclick="hideCouponModal()" class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                        Cancel
                    </button>
                    <button type="button" onclick="applyCoupon()" class="flex-1 bg-brand-black text-brand py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors">
                        Apply
                    </button>
                </div>
            </form>
        </div>
    </div>

    <script>
        // Initialize JavaScript variables
        let cart = <?php echo json_encode(array_values($_SESSION['cart'] ?? [])); ?>;
        let selectedTableId = null;
        let selectedTableName = null;
        let selectedCustomerName = null;
        let selectedDiscount = null;
        let selectedDiscountPercent = 0;
        let selectedPaymentMethod = 'cash';
        let selectedPaymentLabel = 'Cash';
        let amountReceived = 0;
        let orderType = 'dine_in';
        const baseSubtotal = <?php echo json_encode((float)$subtotal); ?>;
        const taxRate = <?php echo json_encode((float)$taxRate); ?>;
        const lowStockCount = <?php echo json_encode((int)$lowStockCount); ?>;
        const availableTables = <?php echo json_encode(array_map(function ($table) {
            return [
                'id' => (int)$table['id'],
                'name' => 'Table ' . $table['table_number'],
            ];
        }, $availableTables)); ?>;

        // Initialize order type buttons
        document.addEventListener('DOMContentLoaded', function() {
            setOrderType('dinein');
            restoreSelectedTable();
            updateSelectedDiscountDisplay();
            updatePaymentMethodDisplay();
            updateAmountReceivedDisplay();
            enableBackdropClose();
            if (lowStockCount > 0) {
                showNotification(lowStockCount + ' low stock item(s) need attention', 'warning');
            }
        });

        function enableBackdropClose() {
            document.addEventListener('click', function(event) {
                const modal = event.target;
                if (!(modal instanceof HTMLElement) || !modal.id.endsWith('Modal')) {
                    return;
                }

                if (modal.id === 'printConfirmationModal') {
                    modal.remove();
                    return;
                }

                modal.classList.add('hidden');
            });
        }

        function selectMenuType(type) {
            window.location.href = 'menu.php?type=' + encodeURIComponent(type);
        }

        function selectCategory(categoryId) {
            window.location.href = 'menu.php?type=<?php echo htmlspecialchars($menuType); ?>&category=' + categoryId;
        }

        function submitProtectedForm(form) {
            const token = document.createElement('input');
            token.type = 'hidden';
            token.name = 'csrf_token';
            token.value = '<?php echo csrfToken(); ?>';
            form.appendChild(token);
            document.body.appendChild(form);
            form.submit();
        }

        function addToCart(itemId) {
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = 'menu.php?type=<?php echo htmlspecialchars($menuType); ?>&category=<?php echo $selectedCategoryId; ?>';
            
            const actionInput = document.createElement('input');
            actionInput.type = 'hidden';
            actionInput.name = 'action';
            actionInput.value = 'add_to_cart';
            
            const itemIdInput = document.createElement('input');
            itemIdInput.type = 'hidden';
            itemIdInput.name = 'item_id';
            itemIdInput.value = itemId;
            
            const quantityInput = document.createElement('input');
            quantityInput.type = 'hidden';
            quantityInput.name = 'quantity';
            quantityInput.value = 1;
            
            form.appendChild(actionInput);
            form.appendChild(itemIdInput);
            form.appendChild(quantityInput);
            submitProtectedForm(form);
        }

        function clearCartNoReturn() {
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = 'menu.php?type=<?php echo htmlspecialchars($menuType); ?>&category=<?php echo $selectedCategoryId; ?>';
            
            const actionInput = document.createElement('input');
            actionInput.type = 'hidden';
            actionInput.name = 'action';
            actionInput.value = 'clear_cart_no_return';
            
            form.appendChild(actionInput);
            submitProtectedForm(form);
        }

        function showClearCartModal() {
            document.getElementById('clearCartModal').classList.remove('hidden');
        }

        function hideClearCartModal() {
            document.getElementById('clearCartModal').classList.add('hidden');
        }

        function clearCart() {
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = 'menu.php?type=<?php echo htmlspecialchars($menuType); ?>&category=<?php echo $selectedCategoryId; ?>';
            
            const actionInput = document.createElement('input');
            actionInput.type = 'hidden';
            actionInput.name = 'action';
            actionInput.value = 'clear_cart';
            
            form.appendChild(actionInput);
            submitProtectedForm(form);
        }

        function updateQuantity(itemId, newQuantity) {
            if (newQuantity < 1) {
                removeFromCart(itemId);
                return;
            }
            
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = 'menu.php?type=<?php echo htmlspecialchars($menuType); ?>&category=<?php echo $selectedCategoryId; ?>';
            
            const actionInput = document.createElement('input');
            actionInput.type = 'hidden';
            actionInput.name = 'action';
            actionInput.value = 'update_quantity';
            
            const itemIdInput = document.createElement('input');
            itemIdInput.type = 'hidden';
            itemIdInput.name = 'item_id';
            itemIdInput.value = itemId;
            
            const quantityInput = document.createElement('input');
            quantityInput.type = 'hidden';
            quantityInput.name = 'quantity';
            quantityInput.value = newQuantity;
            
            form.appendChild(actionInput);
            form.appendChild(itemIdInput);
            form.appendChild(quantityInput);
            submitProtectedForm(form);
        }

        function removeFromCart(itemId) {
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = 'menu.php?type=<?php echo htmlspecialchars($menuType); ?>&category=<?php echo $selectedCategoryId; ?>';
            
            const actionInput = document.createElement('input');
            actionInput.type = 'hidden';
            actionInput.name = 'action';
            actionInput.value = 'remove_from_cart';
            
            const itemIdInput = document.createElement('input');
            itemIdInput.type = 'hidden';
            itemIdInput.name = 'item_id';
            itemIdInput.value = itemId;
            
            form.appendChild(actionInput);
            form.appendChild(itemIdInput);
            submitProtectedForm(form);
        }

        function showLogoutModal() {
            document.getElementById('logoutModal').classList.remove('hidden');
        }
        
        function hideLogoutModal() {
            document.getElementById('logoutModal').classList.add('hidden');
        }

        function showStockNotificationModal() {
            document.getElementById('stockNotificationModal').classList.remove('hidden');
        }
        
        function hideStockNotificationModal() {
            document.getElementById('stockNotificationModal').classList.add('hidden');
        }

        function showRecommendationsModal() {
            document.getElementById('recommendationsModal')?.classList.remove('hidden');
        }

        function hideRecommendationsModal() {
            document.getElementById('recommendationsModal')?.classList.add('hidden');
        }

        function showBillModal() {
            document.getElementById('billModal').classList.remove('hidden');
        }
        
        function hideBillModal() {
            document.getElementById('billModal').classList.add('hidden');
        }

        function showTableSelectModal() {
            if (orderType === 'take_away') {
                setOrderType('dinein');
            }
            document.getElementById('tableSelectModal').classList.remove('hidden');
        }
        
        function hideTableSelectModal() {
            document.getElementById('tableSelectModal').classList.add('hidden');
        }

        function selectTable(tableId, tableName) {
            selectedTableId = tableId;
            selectedTableName = tableName;
            localStorage.setItem('selectedTableId', String(tableId));
            localStorage.setItem('selectedTableName', tableName);
            setOrderType('dinein');
            updateSelectedTableDisplay();
            hideTableSelectModal();
        }

        function clearSelectedTable() {
            selectedTableId = null;
            selectedTableName = null;
            localStorage.removeItem('selectedTableId');
            localStorage.removeItem('selectedTableName');
            updateSelectedTableDisplay();
            hideTableSelectModal();
        }

        function restoreSelectedTable() {
            const storedTableId = parseInt(localStorage.getItem('selectedTableId'), 10);
            const storedTableName = localStorage.getItem('selectedTableName');
            const tableStillAvailable = availableTables.some(table => table.id === storedTableId);

            if (storedTableId && storedTableName && tableStillAvailable) {
                selectedTableId = storedTableId;
                selectedTableName = storedTableName;
            } else {
                clearSelectedTable();
                return;
            }

            updateSelectedTableDisplay();
        }

        function updateSelectedTableDisplay() {
            const label = orderType === 'take_away' ? 'Take Out' : (selectedTableName || 'Select Table');
            document.getElementById('selectedTableLabel').textContent = label;
            document.getElementById('billTableLabel').textContent = label;
            document.getElementById('billOrderTypeLabel').textContent = orderType === 'take_away' ? 'Take Out' : 'Dine In';

            document.querySelectorAll('.table-option').forEach(button => {
                const isSelected = Number(button.dataset.tableId) === selectedTableId;
                button.classList.toggle('border-brand-black', isSelected);
                button.classList.toggle('bg-brand', isSelected);
                button.classList.toggle('shadow-[2px_2px_0px_0px_rgba(23,23,23,1)]', isSelected);
            });
        }

        function printBill() {
            // First record the sale in sales report and ticket system
            recordSaleAndShowPrintConfirmation();
        }

        function recordSaleAndShowPrintConfirmation() {
            if (cart.length === 0) {
                showNotification('Cart is empty', 'error');
                return;
            }

            if (orderType === 'dine_in' && !selectedTableId) {
                showNotification('Please select an available table first', 'warning');
                showTableSelectModal();
                return;
            }

            const totalDue = getDiscountTotals().totalAmount;
            if (amountReceived < totalDue) {
                showNotification('Amount given must be equal to or greater than total due', 'warning');
                showAmountReceivedModal();
                return;
            }

            const orderData = {
                cart: cart,
                table_id: orderType === 'dine_in' ? selectedTableId : null,
                customer_name: selectedCustomerName || 'Guest',
                order_type: orderType || 'dine_in',
                payment_method: selectedPaymentMethod,
                discount_name: selectedDiscount || '',
                discount_percent: selectedDiscount ? selectedDiscountPercent : 0,
                amount_received: amountReceived
            };

            fetch('api.php?action=create_order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': '<?php echo csrfToken(); ?>',
                },
                body: JSON.stringify(orderData)
            })
            .then(response => {
                console.log('Response status:', response.status);
                console.log('Response headers:', response.headers);
                return response.text();
            })
            .then(text => {
                console.log('Raw response:', text);
                try {
                    const data = JSON.parse(text);
                    if (data.success) {
                        // Sale recorded successfully, show print confirmation
                        showPrintConfirmation(data.order_id, data.order_number);
                    } else {
                        showNotification('Failed to record sale: ' + data.error, 'error');
                    }
                } catch (e) {
                    console.error('JSON parse error:', e);
                    showNotification('Invalid response from server', 'error');
                }
            })
            .catch(error => {
                console.error('Fetch error:', error);
                showNotification('Error recording sale', 'error');
            });
        }

        function showPrintConfirmation(orderId, orderNumber) {
            // Create confirmation modal
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200">
                    <div class="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
                        <i class="fa-solid fa-check text-green-600 text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-serif font-bold text-brand-black text-center mb-2">Sale Recorded!</h3>
                    <p class="text-gray-600 text-center mb-2">Order #${orderNumber} has been saved to sales report and ticket system.</p>
                    <p class="text-sm text-gray-500 text-center mb-6">Would you like to print the receipt now?</p>
                    
                    <div class="flex gap-3">
                        <button onclick="closePrintConfirmation('${modal.id}')" class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                            Skip
                        </button>
                        <button onclick="confirmPrint('${modal.id}')" class="flex-1 bg-brand-black text-brand py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors">
                            <i class="fa-solid fa-print mr-2"></i> Print
                        </button>
                    </div>
                </div>
            `;
            
            modal.id = 'printConfirmationModal';
            document.body.appendChild(modal);
        }

        function closePrintConfirmation(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.remove();
            }
            // Clear cart without returning stock and close bill modal after recording sale
            cart = [];
            selectedTableId = null;
            selectedTableName = null;
            selectedCustomerName = null;
            selectedPaymentMethod = 'cash';
            selectedPaymentLabel = 'Cash';
            selectedDiscount = null;
            selectedDiscountPercent = 0;
            amountReceived = 0;
            localStorage.removeItem('selectedTableId');
            localStorage.removeItem('selectedTableName');
            updatePaymentMethodDisplay();
            updateSelectedDiscountDisplay();
            updateAmountReceivedDisplay();
            clearCartNoReturn();
            hideBillModal();
        }

        function confirmPrint(modalId) {
            // Remove the confirmation modal
            closePrintConfirmation(modalId);
            
            // Show print preview
            window.print();
        }

        function updateCart() {
            // Reload the page to sync cart with server
            window.location.reload();
        }

        function showNotification(message, type = 'success') {
            // Create notification element
            const notification = document.createElement('div');
            notification.className = `fixed top-4 left-1/2 z-50 w-[min(calc(100%-2rem),28rem)] p-4 rounded-xl shadow-lg border transform -translate-x-1/2 -translate-y-full opacity-0 transition-all duration-300`;
            
            // Set colors based on type
            if (type === 'error') {
                notification.className += ' bg-red-50 border-red-200 text-red-700';
            } else if (type === 'warning') {
                notification.className += ' bg-yellow-50 border-yellow-200 text-yellow-700';
            } else {
                notification.className += ' bg-green-50 border-green-200 text-green-700';
            }
            
            notification.innerHTML = `
                <div class="flex items-center gap-3">
                    <i class="fa-solid ${type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i>
                    <span class="font-medium">${message}</span>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            // Slide in
            setTimeout(() => {
                notification.classList.remove('-translate-y-full', 'opacity-0');
                notification.classList.add('translate-y-0', 'opacity-100');
            }, 100);
            
            // Auto remove after 3 seconds
            setTimeout(() => {
                notification.classList.remove('translate-y-0', 'opacity-100');
                notification.classList.add('-translate-y-full', 'opacity-0');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, 3000);
        }

        function showCouponModal() {
            document.getElementById('couponModal').classList.remove('hidden');
        }
        
        function hideCouponModal() {
            document.getElementById('couponModal').classList.add('hidden');
        }

        function selectDiscount(discountName, discountPercent = 20) {
            selectedDiscount = discountName;
            selectedDiscountPercent = Math.max(0, Math.min(100, Number(discountPercent) || 0));
            document.getElementById('addDiscountFields').classList.add('hidden');
            document.getElementById('discountPercentFields').classList.remove('hidden');
            document.getElementById('discountPercentInput').value = selectedDiscountPercent;
            updateSelectedDiscountDisplay();
        }

        function showAddDiscountFields() {
            document.getElementById('addDiscountFields').classList.remove('hidden');
            document.getElementById('customDiscountName').focus();
        }

        function selectCustomDiscount() {
            const customName = document.getElementById('customDiscountName').value.trim();
            if (!customName) {
                showNotification('Enter a discount name first', 'warning');
                return;
            }

            selectDiscount(customName, 0);
        }

        function clearDiscount() {
            selectedDiscount = null;
            selectedDiscountPercent = 0;
            document.getElementById('discountPercentFields').classList.add('hidden');
            document.getElementById('addDiscountFields').classList.add('hidden');
            document.getElementById('customDiscountName').value = '';
            document.getElementById('discountPercentInput').value = 0;
            updateSelectedDiscountDisplay();
            showNotification('Discount removed', 'success');
            hideCouponModal();
        }

        function updateDiscountPercent() {
            const percentInput = document.getElementById('discountPercentInput');
            selectedDiscountPercent = Math.max(0, Math.min(100, Number(percentInput.value) || 0));
            percentInput.value = selectedDiscountPercent;
            updateSelectedDiscountDisplay();
        }

        function formatPeso(amount) {
            return '₱' + Number(amount).toLocaleString('en-PH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }

        function getDiscountTotals() {
            const discountPercent = selectedDiscount ? selectedDiscountPercent : 0;
            const discountAmount = baseSubtotal * (discountPercent / 100);
            const discountedSubtotal = Math.max(0, baseSubtotal - discountAmount);
            const taxAmount = discountedSubtotal * (taxRate / 100);
            const totalAmount = discountedSubtotal + taxAmount;

            return {
                discountAmount,
                taxAmount,
                totalAmount
            };
        }

        function getChangeAmount() {
            const totalAmount = getDiscountTotals().totalAmount;
            return Math.max(0, amountReceived - totalAmount);
        }

        function showAmountReceivedModal() {
            document.getElementById('amountReceivedInput').value = amountReceived > 0 ? amountReceived.toFixed(2) : '';
            updateAmountReceivedDisplay();
            document.getElementById('amountReceivedModal').classList.remove('hidden');
            setTimeout(() => document.getElementById('amountReceivedInput').focus(), 50);
        }

        function hideAmountReceivedModal() {
            document.getElementById('amountReceivedModal').classList.add('hidden');
        }

        function confirmAmountReceived() {
            const totalDue = getDiscountTotals().totalAmount;

            if (amountReceived < totalDue) {
                showNotification('Amount given must be equal to or greater than total due', 'warning');
                document.getElementById('amountReceivedInput').focus();
                return;
            }

            hideAmountReceivedModal();
        }

        function updateAmountReceived() {
            const input = document.getElementById('amountReceivedInput');
            amountReceived = Math.max(0, Number(input.value) || 0);
            updateAmountReceivedDisplay();
        }

        function pressAmountKey(key) {
            const input = document.getElementById('amountReceivedInput');
            let value = input.value;

            if (key === '.') {
                if (value.includes('.')) return;
                value = value === '' ? '0.' : value + '.';
            } else {
                const decimalIndex = value.indexOf('.');
                if (decimalIndex !== -1 && value.length - decimalIndex > 2) return;
                value = value === '0' ? key : value + key;
            }

            input.value = value;
            updateAmountReceived();
            input.focus();
        }

        function setAmountReceivedPreset(amount) {
            const input = document.getElementById('amountReceivedInput');
            amountReceived = Math.max(0, amountReceived + (Number(amount) || 0));
            input.value = amountReceived.toFixed(2);
            updateAmountReceivedDisplay();
            input.focus();
        }

        function backspaceAmountReceived() {
            const input = document.getElementById('amountReceivedInput');
            input.value = input.value.slice(0, -1);
            updateAmountReceived();
            input.focus();
        }

        function clearAmountReceived() {
            amountReceived = 0;
            document.getElementById('amountReceivedInput').value = '';
            updateAmountReceivedDisplay();
        }

        function updateAmountReceivedDisplay() {
            const totals = getDiscountTotals();
            const changeAmount = getChangeAmount();
            const amountGivenButtonLabel = document.getElementById('amountGivenButtonLabel');
            const panelChangeAmount = document.getElementById('panelChangeAmount');
            const billAmountReceived = document.getElementById('billAmountReceived');
            const billChangeAmount = document.getElementById('billChangeAmount');
            const amountModalTotal = document.getElementById('amountModalTotal');
            const amountModalChange = document.getElementById('amountModalChange');

            if (amountGivenButtonLabel) {
                amountGivenButtonLabel.textContent = amountReceived > 0 ? formatPeso(amountReceived) : formatPeso(0);
                amountGivenButtonLabel.className = amountReceived > 0 ? 'text-[10px] font-bold text-brand-black leading-none' : 'text-[10px] font-bold text-gray-500 leading-none';
            }
            if (panelChangeAmount) panelChangeAmount.textContent = formatPeso(changeAmount);
            if (billAmountReceived) billAmountReceived.textContent = formatPeso(amountReceived);
            if (billChangeAmount) billChangeAmount.textContent = formatPeso(changeAmount);
            if (amountModalTotal) amountModalTotal.textContent = formatPeso(totals.totalAmount);
            if (amountModalChange) amountModalChange.textContent = formatPeso(changeAmount);
        }

        function updateSelectedDiscountDisplay() {
            const discountLabel = document.getElementById('selectedDiscountLabel') || document.querySelector('#couponModal .bg-gray-50 span:last-child');
            const couponButtonLabel = document.getElementById('couponButtonLabel');
            const discountText = selectedDiscount ? selectedDiscount + ' (' + selectedDiscountPercent + '%)' : 'None';
            if (discountLabel) {
                discountLabel.textContent = discountText;
                discountLabel.className = selectedDiscount ? 'font-bold text-brand-black' : 'font-bold text-gray-400';
            }
            if (couponButtonLabel) {
                couponButtonLabel.textContent = discountText;
                couponButtonLabel.className = selectedDiscount ? 'text-[10px] font-bold text-brand-black leading-none max-w-full truncate' : 'text-[10px] font-bold text-gray-500 leading-none';
            }

            const billDiscountHeader = document.getElementById('billDiscountHeader');
            const billDiscountRow = document.getElementById('billDiscountRow');
            const billDiscountLabel = document.getElementById('billDiscountLabel');
            const billDiscountAmountRow = document.getElementById('billDiscountAmountRow');
            const billDiscountAmount = document.getElementById('billDiscountAmount');
            const billTaxAmount = document.getElementById('billTaxAmount');
            const billTotalAmount = document.getElementById('billTotalAmount');
            const panelTotalAmount = document.getElementById('panelTotalAmount');
            const totals = getDiscountTotals();

            if (billDiscountHeader && billDiscountRow && billDiscountLabel && billDiscountAmountRow && billDiscountAmount && billTaxAmount && billTotalAmount && panelTotalAmount) {
                billDiscountHeader.textContent = 'Discount: ' + discountText;
                billDiscountLabel.textContent = discountText;
                billDiscountAmount.textContent = '-' + formatPeso(totals.discountAmount);
                billTaxAmount.textContent = formatPeso(totals.taxAmount);
                billTotalAmount.textContent = formatPeso(totals.totalAmount);
                panelTotalAmount.textContent = formatPeso(totals.totalAmount);
                billDiscountHeader.classList.toggle('hidden', !selectedDiscount);
                billDiscountRow.classList.toggle('hidden', !selectedDiscount);
                billDiscountRow.classList.toggle('flex', !!selectedDiscount);
                billDiscountAmountRow.classList.toggle('hidden', !selectedDiscount);
                billDiscountAmountRow.classList.toggle('flex', !!selectedDiscount);
            }
            updateAmountReceivedDisplay();

            document.querySelectorAll('.discount-option').forEach(button => {
                const isSelected = selectedDiscount && button.textContent.includes(selectedDiscount);
                button.classList.toggle('border-brand-black', isSelected);
                button.classList.toggle('bg-brand-light', isSelected);
            });
        }

        function applyCoupon() {
            if (selectedDiscount) {
                showNotification(selectedDiscount + ' discount selected at ' + selectedDiscountPercent + '%', 'success');
            }
            hideCouponModal();
        }

        function togglePaymentDropup() {
            const dropup = document.getElementById('paymentDropup');
            if (dropup) {
                dropup.classList.toggle('hidden');
            }
        }

        function hidePaymentDropup() {
            const dropup = document.getElementById('paymentDropup');
            if (dropup) {
                dropup.classList.add('hidden');
            }
        }

        function selectPaymentMethod(method, label) {
            selectedPaymentMethod = method;
            selectedPaymentLabel = label;
            updatePaymentMethodDisplay();
        }

        function updatePaymentMethodDisplay() {
            const billPaymentMethodLabel = document.getElementById('billPaymentMethodLabel');
            const paymentButtonLabel = document.getElementById('paymentButtonLabel');
            if (billPaymentMethodLabel) {
                billPaymentMethodLabel.textContent = 'Payment: ' + selectedPaymentLabel;
            }
            if (paymentButtonLabel) {
                paymentButtonLabel.textContent = selectedPaymentLabel || 'Cash';
            }

            document.querySelectorAll('.payment-option').forEach(button => {
                const isSelected = button.dataset.paymentMethod === selectedPaymentMethod;
                button.classList.toggle('border-2', isSelected);
                button.classList.toggle('border-brand-black', isSelected);
                button.classList.toggle('bg-brand', isSelected);
                button.classList.toggle('text-brand-black', isSelected);
                button.classList.toggle('shadow-[2px_2px_0px_0px_rgba(23,23,23,1)]', isSelected);
                button.classList.toggle('border', !isSelected);
                button.classList.toggle('border-gray-300', !isSelected);
                button.classList.toggle('bg-white', !isSelected);
                const check = button.querySelector('.payment-check');
                if (check) {
                    check.classList.toggle('hidden', !isSelected);
                }
            });
        }

        function applyPaymentMethod() {
            showNotification('Payment method set to ' + selectedPaymentLabel, 'success');
            hidePaymentDropup();
        }

        function setOrderType(type) {
            const dineInBtn = document.getElementById('dineInBtn');
            const takeAwayBtn = document.getElementById('takeAwayBtn');
            
            if (type === 'dinein') {
                dineInBtn.className = 'px-3 py-1.5 rounded-md bg-white text-brand-black font-bold shadow-sm border border-gray-300 transition-all';
                takeAwayBtn.className = 'px-3 py-1.5 rounded-md text-gray-500 hover:text-brand-black font-semibold transition-all';
                orderType = 'dine_in';
            } else {
                dineInBtn.className = 'px-3 py-1.5 rounded-md text-gray-500 hover:text-brand-black font-semibold transition-all';
                takeAwayBtn.className = 'px-3 py-1.5 rounded-md bg-white text-brand-black font-bold shadow-sm border border-gray-300 transition-all';
                orderType = 'take_away';
                selectedTableId = null;
                selectedTableName = null;
                localStorage.removeItem('selectedTableId');
                localStorage.removeItem('selectedTableName');
            }
            updateSelectedTableDisplay();
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

        // Time-based menu collapse toggle
        const timeMenuPanel = document.getElementById('timeMenuPanel');
        const timeMenuToggle = document.getElementById('timeMenuToggle');
        const timeMenuContent = document.getElementById('timeMenuContent');
        const timeMenuHeaderText = document.getElementById('timeMenuHeaderText');
        const timeMenuCollapsedIcon = document.getElementById('timeMenuCollapsedIcon');
        let isTimeMenuCollapsed = localStorage.getItem('timeMenuCollapsed') === 'true';

        function applyTimeMenuState() {
            if (!timeMenuContent) return;
            if (isTimeMenuCollapsed) {
                timeMenuContent.classList.add('hidden');
                if (timeMenuPanel) {
                    timeMenuPanel.classList.remove('w-[170px]');
                    timeMenuPanel.classList.add('w-[52px]');
                }
                if (timeMenuHeaderText) {
                    timeMenuHeaderText.classList.add('hidden');
                }
                if (timeMenuCollapsedIcon) {
                    timeMenuCollapsedIcon.classList.remove('hidden');
                    timeMenuCollapsedIcon.classList.add('flex');
                }
            } else {
                timeMenuContent.classList.remove('hidden');
                if (timeMenuPanel) {
                    timeMenuPanel.classList.remove('w-[52px]');
                    timeMenuPanel.classList.add('w-[170px]');
                }
                if (timeMenuHeaderText) {
                    timeMenuHeaderText.classList.remove('hidden');
                }
                if (timeMenuCollapsedIcon) {
                    timeMenuCollapsedIcon.classList.add('hidden');
                    timeMenuCollapsedIcon.classList.remove('flex');
                }
            }
        }

        if (timeMenuToggle) {
            applyTimeMenuState();
            timeMenuToggle.addEventListener('click', () => {
                isTimeMenuCollapsed = !isTimeMenuCollapsed;
                localStorage.setItem('timeMenuCollapsed', String(isTimeMenuCollapsed));
                applyTimeMenuState();
            });
        }
    </script>
    <?php include __DIR__ . '/staff_chatbot.php'; ?>
</body>
</html>



